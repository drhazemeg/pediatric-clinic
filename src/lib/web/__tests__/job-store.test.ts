import { beforeEach, describe, expect, it } from "bun:test";
import {
	activeJobCountStore,
	jobActions,
	jobCountsStore,
	jobErrorStore,
	jobIdsStore,
	jobsStore,
	type JobResult
} from "@/integrations/tanstack-store/job-store";

function createResult(
	jobId: string,
	status: JobResult["status"] = "completed"
): JobResult {
	return {
		jobId,
		kind: "ai_soap_draft",
		status,
		result: { note: jobId },
		errorMessage: null,
		timestamp: Date.now()
	};
}

describe("job store", () => {
	beforeEach(() => {
		jobActions.resetAll();
	});

	it("starts with empty job state", () => {
		expect(jobsStore.state).toEqual({
			jobIds: [],
			completedResults: {},
			processedStates: {},
			removedIds: [],
			error: null
		});
	});

	it("adds each job once and clears its removed marker when retried", () => {
		jobActions.addJob("job-1");
		jobActions.addJob("job-1");
		expect(jobsStore.state.jobIds).toEqual(["job-1"]);

		jobActions.removeJob("job-1");
		expect(jobsStore.state.removedIds).toEqual(["job-1"]);

		jobActions.addJob("job-1");
		expect(jobsStore.state.jobIds).toEqual(["job-1"]);
		expect(jobsStore.state.removedIds).toEqual([]);
	});

	it("tracks job status updates", () => {
		jobActions.trackStatus("job-1", "running");
		jobActions.trackStatus("job-1", "completed");

		expect(jobsStore.state.processedStates["job-1"]).toBe("completed");
	});

	it("stores, replaces, and clears results by job ID", () => {
		jobActions.setResult(createResult("job-1"));
		jobActions.setResult({
			...createResult("job-1"),
			result: { note: "updated" }
		});

		expect(jobsStore.state.completedResults["job-1"]?.result).toEqual({
			note: "updated"
		});

		jobActions.clearResult("job-1");
		expect(jobsStore.state.completedResults).toEqual({});
	});

	it("dismisses a result and removes its job from tracking", () => {
		jobActions.addJob("job-1");
		jobActions.setResult(createResult("job-1"));

		jobActions.dismissResult("job-1");

		expect(jobsStore.state.jobIds).toEqual([]);
		expect(jobsStore.state.completedResults).toEqual({});
		expect(jobsStore.state.removedIds).toEqual(["job-1"]);
	});

	it("updates derived stores from the job state", () => {
		jobActions.addJob("job-1");
		jobActions.setResult(createResult("job-1", "completed"));
		jobActions.setResult(createResult("job-2", "failed"));
		jobActions.setResult(createResult("job-3", "completed_partial"));

		expect(jobIdsStore.state).toEqual(["job-1"]);
		expect(activeJobCountStore.state).toBe(1);
		expect(jobCountsStore.state).toEqual({
			total: 1,
			completed: 1,
			partial: 1,
			failed: 1,
			cancelled: 0
		});
	});

	it("sets and clears the last surfaced error", () => {
		jobActions.setError("Connection failed");
		expect(jobErrorStore.state).toBe("Connection failed");

		jobActions.clearError();
		expect(jobErrorStore.state).toBeNull();
	});
});
