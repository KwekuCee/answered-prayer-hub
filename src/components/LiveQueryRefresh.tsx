import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

const TABLE_QUERY_KEYS: Record<string, string[][]> = {
  audit_logs: [["audit-logs"], ["church-admin-audit-logs"]],
  bus_points: [["busPoints"], ["all-bus-points"]],
  churches: [
    ["churches-list"],
    ["all-churches"],
    ["church-admin-church-options"],
    ["church"],
    ["all-attendees"],
    ["attendees"],
    ["all-inviters"],
    ["inviters"],
  ],
  inviters: [["inviters"], ["all-inviters"]],
  live_stream_settings: [["live-stream"], ["live-stream-settings"]],
  members: [["attendees"], ["all-attendees"]],
  prayer_points: [["all-prayer-points"]],
  prayer_wall: [["prayer-wall-requests"]],
  programs: [["active-program"], ["all-programs"]],
  profiles: [["all-admins"], ["church-admin-audit-logs"]],
  resources: [["resources"], ["all-resources"]],
  shop_orders: [["admin-shop-orders"]],
  shop_products: [["shop-products-public"], ["admin-shop-products"]],
  shop_settings: [["shop-settings-public"], ["admin-shop-settings"]],
  testimonials: [["live-testimonials"], ["all-testimonials"], ["live-testimonies-grid"]],
  user_roles: [["all-admins"]],
};

export default function LiveQueryRefresh() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let removeSubscription: (() => void) | undefined;

    import("@/integrations/supabase/client")
      .then(({ supabase }) => {
        if (cancelled || typeof supabase.channel !== "function") return;

        let channel = supabase.channel("site-live-query-refresh");
        Object.entries(TABLE_QUERY_KEYS).forEach(([table, queryKeys]) => {
          channel = channel.on(
            "postgres_changes",
            { event: "*", schema: "public", table },
            () => {
              queryKeys.forEach((queryKey) => {
                void queryClient.invalidateQueries({ queryKey });
              });
            },
          );
        });

        channel.subscribe();
        removeSubscription = () => {
          void supabase.removeChannel(channel);
        };
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      removeSubscription?.();
    };
  }, [queryClient]);

  return null;
}
