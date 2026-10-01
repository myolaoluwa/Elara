"use client";

import Link from "next/link";
import { ArrowLeft, Check, FileText, LoaderCircle, ClipboardList } from "lucide-react";
import { FormEvent, useState } from "react";

type Analysis = { summary: string; decisions: string[]; actionItems: { task: string; owner: string | null; deadline: string | null }[]; questions: string[]; nextSteps: string[] };

export function MeetingWorkspace({ meetingId, title, date, agenda, attendees, initialTranscript, initialAnalysis }: { meetingId: string; title: string; date: string; agenda: string | null; attendees: string[]; initialTranscript: string; initialAnalysis: Analysis | null }) {
  const [transcript, setTranscript] = useState(initialTranscript);
  const [transcriptDirty, setTranscriptDirty] = useState(false);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function action(name: "save-transcript" | "analyze" | "create-tasks") {
    setPending(name); setMessage(null);
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: name, ...(name === "save-transcript" ? { transcript } : {}) }) });
      const payload = await response.json();
      if (!response.ok) setMessage(payload.error || "Unable to complete that action");
      else if (name === "analyze") { setAnalysis(payload.analysis); setMessage("Draft minutes generated for review."); }
      else if (name === "create-tasks") setMessage(`${payload.tasks.length} task${payload.tasks.length === 1 ? "" : "s"} created and minutes approved.`);
      else { setTranscriptDirty(false); setMessage("Transcript saved."); }
    } catch {
      setMessage("Unable to reach Elara. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }
  async function uploadAudio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending("audio"); setMessage(null);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/audio`, { method: "POST", body: new FormData(event.currentTarget) });
      const payload = await response.json();
      if (response.ok) { setTranscript(payload.transcript.text); setTranscriptDirty(true); setAnalysis(null); setMessage("Audio transcribed. Review and save the transcript before analysis."); }
      else setMessage(payload.error || "Audio transcription failed");
    } catch {
      setMessage("Unable to reach Elara. Check your connection and try again.");
    } finally {
      setPending(null);
    }
  }
  return <div className="meeting-workspace"><Link href="/meetings" className="back-link"><ArrowLeft size={14} />All meetings</Link><div className="page-heading compact-heading"><div><p className="eyebrow">Meeting record</p><h1>{title}</h1><p className="page-subtitle">{date}{attendees.length ? ` · ${attendees.join(", ")}` : ""}</p></div></div>{message && <div className="meeting-message">{message}</div>}<div className="meeting-columns"><section className="panel meeting-section"><header><FileText size={17} /><div><p className="eyebrow">Source record</p><h2>Transcript</h2></div></header>{agenda && <div className="agenda-block"><strong>Agenda</strong><p>{agenda}</p></div>}<form className="audio-upload" onSubmit={uploadAudio}><input aria-label="Meeting recording" name="audio" type="file" accept="audio/*,video/mp4" required /><button className="secondary-button" disabled={Boolean(pending)}>{pending === "audio" ? <LoaderCircle className="spin" size={14} /> : null}Transcribe audio</button></form><textarea aria-label="Meeting transcript" value={transcript} onChange={(event) => { setTranscript(event.target.value); setTranscriptDirty(true); setAnalysis(null); }} placeholder="Paste the meeting transcript here. Only this source will be used to generate minutes." rows={18} /><button className="secondary-button" disabled={!transcript.trim() || Boolean(pending)} onClick={() => action("save-transcript")}>{pending === "save-transcript" ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />}Save transcript</button></section><section className="panel meeting-section"><header><ClipboardList size={17} /><div><p className="eyebrow">Review required</p><h2>AI minutes</h2></div></header>{analysis ? <div className="minutes"><MinuteBlock title="Discussion summary" content={analysis.summary} /><MinuteList title="Decisions" items={analysis.decisions} /><MinuteList title="Action items" items={analysis.actionItems.map((item) => `${item.task}${item.owner ? ` — ${item.owner}` : ""}`)} /><MinuteList title="Open questions" items={analysis.questions} /><button className="primary-button" disabled={Boolean(pending)} onClick={() => action("create-tasks")}>{pending === "create-tasks" ? <LoaderCircle className="spin" size={14} /> : <Check size={14} />}Approve and create tasks</button></div> : <div className="minutes-empty"><p>Generate a draft only after saving a transcript. AI output remains unconfirmed until you approve it.</p></div>}<button className="secondary-button analyze-button" disabled={!transcript.trim() || transcriptDirty || Boolean(pending)} onClick={() => action("analyze")}>{pending === "analyze" ? <LoaderCircle className="spin" size={14} /> : <ClipboardList size={14} />}Generate draft minutes</button></section></div></div>;
}
function MinuteBlock({ title, content }: { title: string; content: string }) { return <section><h3>{title}</h3><p>{content}</p></section>; }
function MinuteList({ title, items }: { title: string; items: string[] }) { return <section><h3>{title}</h3>{items.length ? <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>None supported by the transcript.</p>}</section>; }
