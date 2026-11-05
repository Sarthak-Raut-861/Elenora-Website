import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shirt, Play, CheckCircle, Clock, AlertCircle, LogOut } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../auth-context";
import type { DryCleaningRequest } from "../types";

export function DryCleaningPortal() {
  const { token, logout, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading } = useQuery<DryCleaningRequest[]>({
    queryKey: ["dry-cleaning-jobs", token],
    queryFn: () => api.listDryCleaningPortalJobs(token!),
    enabled: Boolean(token),
  });

  const startCleaningMutation = useMutation({
    mutationFn: (requestId: number) => api.startCleaning(token!, requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dry-cleaning-jobs"] }),
  });

  const completeCleaningMutation = useMutation({
    mutationFn: (requestId: number) => api.markCleaningDone(token!, requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dry-cleaning-jobs"] }),
  });

  return (
    <div style={{ background: "var(--color-bg-primary)", minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--color-accent-gold)", letterSpacing: "0.1em", fontWeight: 600 }}>
              Certified Partner Portal
            </span>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", color: "var(--color-text-primary)", margin: "4px 0" }}>
              Active Fabric Sanitization Jobs
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
              Logged in as {user?.full_name || user?.email}
            </p>
          </div>

          <button
            onClick={() => logout()}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "rgba(224,112,112,0.15)", color: "var(--color-error)", border: "none", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Jobs List */}
        {jobs.length === 0 ? (
          <div style={{ background: "var(--color-bg-secondary)", borderRadius: 12, border: "1px solid var(--color-border)", padding: "48px 20px", textAlign: "center" }}>
            <Shirt size={36} color="var(--color-accent-gold-dim)" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.2rem", color: "var(--color-text-primary)" }}>
              No Open Sanitization Jobs
            </h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
              All dispatched atelier garments are currently processed and verified.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                style={{
                  background: "var(--color-bg-secondary)",
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  padding: "20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                      Job #{job.id} — Asset #{job.asset_id}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 9999,
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        background: job.status === "completed" ? "rgba(126,200,160,0.15)" : "rgba(232,201,138,0.15)",
                        color: job.status === "completed" ? "var(--color-success)" : "#E8C98A",
                      }}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
                    Notes: {job.notes || "Standard eco-clean & ozone sterilization required"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  {job.status === "sent" && (
                    <button
                      onClick={() => startCleaningMutation.mutate(job.id)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, background: "var(--color-accent-gold)", color: "#1E0A14", border: "none", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      <Play size={14} /> Begin Treatment
                    </button>
                  )}

                  {job.status === "in_progress" && (
                    <button
                      onClick={() => completeCleaningMutation.mutate(job.id)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, background: "rgba(126,200,160,0.2)", color: "var(--color-success)", border: "1px solid var(--color-success)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
                    >
                      <CheckCircle size={14} /> Mark Sanitized & Done
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
