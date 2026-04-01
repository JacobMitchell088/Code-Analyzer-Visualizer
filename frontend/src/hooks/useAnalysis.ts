import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { submitAnalysis, fetchJob } from "../api/client";
import { useAnalysisStore } from "../store/analysisStore";

export function useSubmitAnalysis() {
  const setJobId = useAnalysisStore((s) => s.setJobId);

  return async (repoUrl: string, branch?: string) => {
    const { job_id } = await submitAnalysis(repoUrl, branch);
    setJobId(job_id);
  };
}

export function useJobStatus() {
  const jobId = useAnalysisStore((s) => s.jobId);
  const setResult = useAnalysisStore((s) => s.setResult);

  const query = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJob(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || status === "DONE" || status === "ERROR") return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (query.data?.status === "DONE" && query.data.result) {
      setResult(query.data.result);
    }
  }, [query.data, setResult]);

  return query;
}
