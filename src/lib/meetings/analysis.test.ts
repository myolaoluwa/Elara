import { describe, expect, it } from "vitest";
import { analyzeTranscript } from "./analysis";

describe("meeting analysis fallback", () => {
  it("extracts only transcript-supported decisions and actions", async () => {
    const previous = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const result = await analyzeTranscript("We agreed to renew for one year.\nJohn will send the proposal Friday.\nWhat is the final budget?");
    expect(result.decisions).toEqual(["We agreed to renew for one year."]);
    expect(result.actionItems[0]?.task).toContain("John will send");
    expect(result.questions).toEqual(["What is the final budget?"]);
    if (previous) process.env.OPENAI_API_KEY = previous;
  });
});
