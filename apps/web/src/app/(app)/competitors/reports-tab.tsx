'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useState } from 'react';
import { api } from '@/lib/api-client';
import {
  Download,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsTab() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCsvDownload = async () => {
    setIsDownloading(true);
    try {
      const csvContent = await api<string>('/competitors/reports/executive');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `competitor_executive_report_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Executive CSV report downloaded successfully!');
    } catch (err) {
      toast.error('Failed to compile report. Ensure tracked data exists.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Overview Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-xl text-white flex items-center gap-2">
          <FileText className="h-6 w-6 text-indigo-400" />
          Executive Intelligence Reports
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Generate complete snapshot audits and operational strategy spreadsheets to present to stakeholders, store in physical archives, or evaluate locally in Excel and standard BI software.
        </p>

        <div className="border-t border-border/60 pt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3 items-start text-sm text-slate-300">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Contains side-by-side local competitor CSAT and rating scores matrices.</span>
          </div>
          <div className="flex gap-3 items-start text-sm text-slate-300">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Maps out all detected Indian local market gap bottleneck summaries.</span>
          </div>
          <div className="flex gap-3 items-start text-sm text-slate-300">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Compiles the complete AI product upgrade and pricing action roadmap.</span>
          </div>
          <div className="flex gap-3 items-start text-sm text-slate-300">
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Fully clean and sanitized layout, ready to open in Microsoft Excel or Google Sheets.</span>
          </div>
        </div>
      </div>

      {/* Exporter Widgets Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* CSV Exporter */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between hover:border-indigo-500/20 transition-all">
          <div className="space-y-2">
            <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400 w-fit">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h4 className="font-bold text-lg text-white">Download CSV Spreadsheet</h4>
            <p className="text-xs text-muted-foreground">
              Compiles rating ratios, counts, AI recommendations lists, and market insight titles. Perfect for Excel, Google Sheets, or custom dashboard pipelines.
            </p>
          </div>

          <button
            onClick={handleCsvDownload}
            disabled={isDownloading}
            className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 text-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'Compiling CSV Data...' : 'Download Executive CSV'}
          </button>
        </div>

        {/* PDF Exporter (Design mock / future enhancement description) */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4 flex flex-col justify-between opacity-75 relative overflow-hidden">
          <div className="space-y-2">
            <div className="rounded-lg bg-indigo-500/10 p-3 text-indigo-400 w-fit">
              <FileText className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-lg text-white">Printable PDF Report</h4>
              <span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold text-indigo-400 uppercase">
                Pro
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Generates a premium executive business audit report complete with color-coded SWOT heatmaps, Recharts trend captures, and formal AI playbooks.
            </p>
          </div>

          <button
            disabled
            className="w-full rounded-lg bg-slate-800 text-slate-500 font-semibold py-2.5 text-sm cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            PDF Printing Enabled (Pro Only)
          </button>
        </div>
      </div>
    </div>
  );
}
