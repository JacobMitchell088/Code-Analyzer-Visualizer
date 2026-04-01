import axios from "axios";
import type { JobStatus } from "./types";

const http = axios.create({ baseURL: "/api" });

export async function submitAnalysis(repoUrl: string, branch?: string): Promise<{ job_id: string }> {
  const { data } = await http.post("/analyze", { repo_url: repoUrl, branch });
  return data;
}

export async function fetchJob(jobId: string): Promise<JobStatus> {
  const { data } = await http.get<JobStatus>(`/jobs/${jobId}`);
  return data;
}
