import { useEffect, useMemo, useRef, useState } from "react";
import { resumeApi } from "../api";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  IconAlert,
  IconArrowRight,
  IconChevronLeft,
  IconClose,
  IconCopy,
  IconCheck,
  IconFile,
  IconTrash,
  IconUpload,
} from "../components/Icons";
import Markdown from "../components/Markdown";
import { useToast } from "../components/Toast";
import { useLibrary } from "../hooks/useLibrary";
import { extractBullets, formatDate, parseAnalysis, toPlainText } from "../utils";

const STAGES = ["Reading your resume", "Picking out skills and experience", "Writing your feedback"];

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Resume({ resumeId, navigate }) {
  const toast = useToast();
  const { resumes, resumesLoading, resumesError, refreshResumes, removeResumeLocal } = useLibrary();

  // upload state
  const [file, setFile] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | uploading | analysing
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  // report state
  const cacheRef = useRef({}); // resume_id -> report (avoids refetch after upload)
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  // delete
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /* ---------- rotate the "analysing" message so the wait feels alive ---------- */
  useEffect(() => {
    if (phase !== "analysing") return;
    setStage(0);
    const id = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4500);
    return () => clearInterval(id);
  }, [phase]);

  /* ---------- load report for #/resume/<id> ---------- */
  useEffect(() => {
    setReportError("");
    if (!resumeId) {
      setReport(null);
      return;
    }
    if (cacheRef.current[resumeId]) {
      setReport(cacheRef.current[resumeId]);
      return;
    }
    let cancelled = false;
    setReport(null);
    setReportLoading(true);
    resumeApi
      .get(resumeId)
      .then((data) => {
        if (cancelled) return;
        cacheRef.current[resumeId] = data;
        setReport(data);
      })
      .catch((e) => !cancelled && setReportError(e.message))
      .finally(() => !cancelled && setReportLoading(false));
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  /* ---------- file selection ---------- */
  const pickFile = (f) => {
    setUploadError("");
    if (!f) return;
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setUploadError("That isn't a PDF. Please choose a .pdf file.");
      return;
    }
    if (f.size === 0) {
      setUploadError("That file is empty.");
      return;
    }
    setFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setUploadError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (phase !== "idle") return;
    pickFile(e.dataTransfer.files?.[0]);
  };

  /* ---------- upload + analyse ---------- */
  const analyse = async () => {
    if (!file || phase !== "idle") return;
    setUploadError("");
    setProgress(0);
    setPhase("uploading");

    try {
      const data = await resumeApi.upload(file, {
        onProgress: setProgress,
        onUploaded: () => {
          setProgress(1);
          setPhase("analysing");
        },
      });

      cacheRef.current[data.resume_id] = {
        resume_id: data.resume_id,
        filename: data.filename,
        analysis: data.analysis,
        created_at: new Date().toISOString(),
      };
      clearFile();
      refreshResumes();
      toast.success("Analysis ready");
      navigate(`resume/${data.resume_id}`);
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setPhase("idle");
    }
  };

  /* ---------- delete ---------- */
  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await resumeApi.remove(toDelete.resume_id);
      delete cacheRef.current[toDelete.resume_id];
      removeResumeLocal(toDelete.resume_id);
      toast.success("Resume deleted");
      if (toDelete.resume_id === resumeId) navigate("resume");
      setToDelete(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  const busy = phase !== "idle";

  /* =============== REPORT VIEW =============== */
  if (resumeId) {
    return (
      <div className="container resume-page">
        <button className="back-link" onClick={() => navigate("resume")}>
          <IconChevronLeft /> All resumes
        </button>

        {reportLoading && <ReportSkeleton />}

        {reportError && !reportLoading && (
          <div className="notice error">
            <IconAlert />
            <div>
              <strong>Couldn't open this report</strong>
              <span>{reportError}</span>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate("resume")}>
              Back
            </button>
          </div>
        )}

        {report && (
          <Report
            report={report}
            onDelete={() => setToDelete(report)}
            onNew={() => navigate("resume")}
            toast={toast}
          />
        )}

        {toDelete && (
          <ConfirmDialog
            title="Delete this resume?"
            message={`“${toDelete.filename}” and its analysis will be permanently removed.`}
            busy={deleting}
            onConfirm={confirmDelete}
            onCancel={() => setToDelete(null)}
          />
        )}
      </div>
    );
  }

  /* =============== UPLOAD + LIBRARY VIEW =============== */
  return (
    <div className="container resume-page">
      <header className="resume-head">
        <p className="eyebrow">Resume Analyzer</p>
        <h1>An honest second opinion on your resume.</h1>
        <p className="lede">
          Upload a PDF. You'll get a clear summary, your strongest points, what's holding it back, and what to
          fix first.
        </p>
      </header>

      <section className="upload">
        {!file ? (
          <div
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            <span className="drop-icon">
              <IconUpload />
            </span>
            <strong>{dragging ? "Drop it here" : "Drag your resume here"}</strong>
            <span>
              or <u>browse files</u> · PDF only
            </span>
          </div>
        ) : (
          <div className="file-ready">
            <span className="file-icon">
              <IconFile />
            </span>
            <div className="file-meta">
              <strong>{file.name}</strong>
              <span>{formatSize(file.size)} · PDF</span>
            </div>
            {!busy && (
              <button className="icon-btn" onClick={clearFile} aria-label="Remove file">
                <IconClose />
              </button>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          hidden
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        {busy && (
          <div className="progress" aria-live="polite">
            <div className={`progress-bar ${phase === "analysing" ? "indeterminate" : ""}`}>
              <i style={phase === "uploading" ? { width: `${Math.round(progress * 100)}%` } : undefined} />
            </div>
            <span>
              {phase === "uploading" ? `Uploading… ${Math.round(progress * 100)}%` : STAGES[stage] + "…"}
            </span>
          </div>
        )}

        {uploadError && (
          <div className="notice error" role="alert">
            <IconAlert />
            <div>
              <strong>Couldn't analyse that file</strong>
              <span>{uploadError}</span>
            </div>
          </div>
        )}

        <div className="upload-actions">
          <button className="btn btn-primary btn-lg" onClick={analyse} disabled={!file || busy}>
            {busy ? (
              <>
                <span className="spinner" /> Analysing
              </>
            ) : (
              <>
                Analyse resume <IconArrowRight />
              </>
            )}
          </button>
          <p>Your file is sent to the server and Gemini to produce the review.</p>
        </div>
      </section>

      {/* ---------- Library ---------- */}
      <section className="library">
        <div className="library-head">
          <h2>
            Your resumes
            {resumes.length > 0 && <span className="rail-count">{resumes.length}</span>}
          </h2>
        </div>

        {resumesLoading ? (
          <div className="library-grid">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton" style={{ height: 236, borderRadius: 12 }} />
            ))}
          </div>
        ) : resumesError && resumes.length === 0 ? (
          <div className="notice error">
            <IconAlert />
            <div>
              <strong>Couldn't load your resumes</strong>
              <span>{resumesError}</span>
            </div>
            <button className="btn btn-ghost" onClick={refreshResumes}>
              Try again
            </button>
          </div>
        ) : resumes.length === 0 ? (
          <div className="empty-card">
            <strong>Nothing here yet</strong>
            <span>Analysed resumes are saved so you can come back to them.</span>
          </div>
        ) : (
          <div className="library-grid">
            {resumes.map((r) => (
              <div key={r.resume_id} className="poster-wrap">
                <button className="card poster" onClick={() => navigate(`resume/${r.resume_id}`)}>
                  <span className="poster-top">PDF</span>
                  <span className="poster-lines" aria-hidden="true">
                    <i style={{ width: "46%" }} />
                    <i style={{ width: "82%" }} />
                    <i style={{ width: "70%" }} />
                    <i style={{ width: "76%" }} />
                    <i style={{ width: "38%" }} />
                  </span>
                  <span className="poster-name">{r.filename}</span>
                  <span className="card-meta">{formatDate(r.created_at)}</span>
                </button>
                <button
                  className="poster-delete"
                  onClick={() => setToDelete(r)}
                  aria-label={`Delete ${r.filename}`}
                >
                  <IconTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {toDelete && (
        <ConfirmDialog
          title="Delete this resume?"
          message={`“${toDelete.filename}” and its analysis will be permanently removed.`}
          busy={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}

/* =============================================================
   REPORT
============================================================= */
function Report({ report, onDelete, onNew, toast }) {
  const [copied, setCopied] = useState(false);
  const parsed = useMemo(() => parseAnalysis(report.analysis), [report.analysis]);
  const byKey = Object.fromEntries(parsed.sections.map((s) => [s.key, s]));
  const structured = parsed.sections.length >= 3;

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(parsed.raw));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };

  return (
    <article className="report">
      <header className="report-head">
        <div>
          <p className="eyebrow">Resume review</p>
          <h1>{report.filename}</h1>
          <p className="report-date">Analysed {formatDate(report.created_at)}</p>
        </div>
        <div className="report-actions">
          <button className="btn btn-ghost" onClick={copyReport}>
            {copied ? <IconCheck /> : <IconCopy />}
            {copied ? "Copied" : "Copy report"}
          </button>
          <button className="btn btn-ghost" onClick={onNew}>
            Analyse another
          </button>
          <button className="icon-btn danger" onClick={onDelete} aria-label="Delete resume">
            <IconTrash />
          </button>
        </div>
      </header>

      {!structured ? (
        <section className="rcard wide">
          <Markdown>{parsed.raw}</Markdown>
        </section>
      ) : (
        <div className="report-grid">
          {byKey.summary && (
            <section className="rcard wide summary">
              <h2>{byKey.summary.title}</h2>
              <Markdown>{byKey.summary.body}</Markdown>
            </section>
          )}

          {byKey.skills && (
            <section className="rcard wide">
              <h2>{byKey.skills.title}</h2>
              <Skills body={byKey.skills.body} />
            </section>
          )}

          {byKey.strengths && (
            <section className="rcard">
              <h2>
                <i className="dot ok" />
                {byKey.strengths.title}
              </h2>
              <Markdown>{byKey.strengths.body}</Markdown>
            </section>
          )}

          {byKey.weaknesses && (
            <section className="rcard">
              <h2>
                <i className="dot warn" />
                {byKey.weaknesses.title}
              </h2>
              <Markdown>{byKey.weaknesses.body}</Markdown>
            </section>
          )}

          {byKey.improvements && (
            <section className="rcard wide">
              <h2>{byKey.improvements.title}</h2>
              <Markdown>{byKey.improvements.body}</Markdown>
            </section>
          )}

          {byKey.feedback && (
            <section className="rcard wide verdict">
              <h2>{byKey.feedback.title}</h2>
              <Markdown>{byKey.feedback.body}</Markdown>
            </section>
          )}
        </div>
      )}
    </article>
  );
}

// Skills: bullets like "Languages: Python, Java" become labelled chip rows;
// short plain bullets become chips; anything else falls back to markdown.
function Skills({ body }) {
  const bullets = extractBullets(body);
  if (bullets.length === 0) return <Markdown>{body}</Markdown>;

  const rows = bullets.map((b) => {
    const m = b.match(/^([^:]{2,32}):\s*(.+)$/);
    if (m) {
      const items = m[2].split(/[,;·]/).map((s) => s.trim()).filter(Boolean);
      return { label: m[1].trim(), items };
    }
    return { label: null, items: [b] };
  });

  const looksChippable = rows.every((r) => r.items.every((i) => i.length <= 48));
  if (!looksChippable) return <Markdown>{body}</Markdown>;

  const labelled = rows.filter((r) => r.label);
  const loose = rows.filter((r) => !r.label).flatMap((r) => r.items);

  return (
    <div className="skills">
      {labelled.map((r) => (
        <div className="skill-row" key={r.label}>
          <span className="skill-label">{r.label}</span>
          <div className="chips">
            {r.items.map((i) => (
              <span className="chip" key={i}>
                {i}
              </span>
            ))}
          </div>
        </div>
      ))}
      {loose.length > 0 && (
        <div className="chips">
          {loose.map((i) => (
            <span className="chip" key={i}>
              {i}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="report">
      <div className="skeleton" style={{ height: 22, width: 120, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 40, width: "52%", marginBottom: 32 }} />
      <div className="report-grid">
        <div className="skeleton wide" style={{ height: 150, borderRadius: 18, gridColumn: "1 / -1" }} />
        <div className="skeleton" style={{ height: 220, borderRadius: 18 }} />
        <div className="skeleton" style={{ height: 220, borderRadius: 18 }} />
      </div>
    </div>
  );
}
