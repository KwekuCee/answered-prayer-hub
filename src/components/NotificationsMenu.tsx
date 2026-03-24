import { useState, useEffect } from "react";
import { Bell, Clock, User, LogIn, Mail, CheckCircle, Trash, Shield, PlusCircle, PenTool } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./ui/popover";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";

interface AuditLog {
    id: string;
    action: string;
    target_type: string;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
    };
}

interface NotificationsMenuProps {
    logs: AuditLog[];
    isLoading: boolean;
}

export const NotificationsMenu = ({ logs, isLoading }: NotificationsMenuProps) => {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        // Simple mock unread logic: any log from the last 12 hours is "unread"
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const recentLogs = logs.filter(log => new Date(log.created_at) > twelveHoursAgo);
        setUnreadCount(recentLogs.length);
    }, [logs]);

    const getLogIcon = (action: string) => {
        switch (action) {
            case "member_confirmed":
            case "bulk_member_confirm":
                return <CheckCircle className="h-4 w-4 text-emerald-500" />;
            case "member_deleted":
            case "bulk_member_delete":
            case "inviter_deleted":
                return <Trash className="h-4 w-4 text-rose-500" />;
            case "login":
                return <LogIn className="h-4 w-4 text-blue-500" />;
            case "send_bulk_email":
                return <Mail className="h-4 w-4 text-indigo-500" />;
            case "role_update":
            case "church_reassign":
                return <Shield className="h-4 w-4 text-amber-500" />;
            default:
                if (action.includes("create") || action.includes("add")) {
                    return <PlusCircle className="h-4 w-4 text-emerald-500" />;
                }
                if (action.includes("update") || action.includes("edit")) {
                    return <PenTool className="h-4 w-4 text-blue-500" />;
                }
                return <User className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getLogText = (log: AuditLog) => {
        const adminName = log.profiles?.full_name || "System/Admin";
        const type = log.target_type.replace("_", " ");
        const action = log.action.replace(/_/g, " ");

        return (
            <span>
                <span className="font-semibold text-foreground">{adminName}</span> performed <strong>{action}</strong> on {type}.
            </span>
        );
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group hover:bg-muted/50 transition-colors">
                    <Bell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[380px] p-0 shadow-lg border-border/50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
                    <h4 className="font-display font-semibold text-sm">Notifications & Activity</h4>
                    {unreadCount > 0 && <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">{unreadCount} recent</Badge>}
                </div>

                <ScrollArea className="h-[400px]">
                    {isLoading ? (
                        <div className="p-4 space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex gap-3 animate-pulse">
                                    <div className="h-8 w-8 rounded-full bg-muted"></div>
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-muted rounded w-3/4"></div>
                                        <div className="h-3 bg-muted rounded w-1/4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <Bell className="h-8 w-8 text-muted-foreground/50 opacity-20" />
                            <p className="text-sm">No recent activity found.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-border/50">
                            {logs.map((log) => {
                                const isRecent = new Date(log.created_at) > new Date(Date.now() - 12 * 60 * 60 * 1000);
                                return (
                                    <div
                                        key={log.id}
                                        className={`p-4 flex gap-3 hover:bg-muted/30 transition-colors ${isRecent ? "bg-muted/10" : ""}`}
                                    >
                                        <div className="mt-0.5 bg-background p-1.5 rounded-full border border-border shrink-0 shadow-sm h-fit">
                                            {getLogIcon(log.action)}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground leading-snug">
                                                {getLogText(log)}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 font-medium">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};
