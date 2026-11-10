
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("public"));

const client = new OpenAI({
  apiKey: process.env.BHARATCODE_API_KEY,
  baseURL: "https://bharatcode.ai/api/model/v1",
  timeout: 90000,
  maxRetries: 1
});

const modes = {
  learn: "Teach the requested DSA topic from beginner level. Explain intuition, definition, working, one simple example, time and space complexity, and applications. Use clear student-friendly language.",

  practice: "Generate three DSA practice questions for the requested topic, mixing easy and medium difficulty. Do not reveal answers immediately.",

  evaluate: "Evaluate the student's submitted answer. Explain what is correct, identify mistakes, give constructive feedback, and show an improved answer.",

  ask: "Act as an interactive DSA tutor. Answer clearly with examples and step-by-step reasoning. Use C++ examples where useful."
};

app.post("/api/tutor", async (req, res) => {
  try {
    const { topic, question, mode } = req.body;

    if (!process.env.BHARATCODE_API_KEY) {
      return res.status(500).json({
        error: "API key is not configured."
      });
    }

    if (!topic || !question || !modes[mode]) {
      return res.status(400).json({
        error: "Please provide a topic, question and valid mode."
      });
    }

    const stream = await client.chat.completions.create({
      model: "qwen-3.8-27b",
      stream: true,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are AlgoBuddy AI, a friendly and knowledgeable DSA tutor.

Your purpose is to help college students understand DSA, practise problem-solving and improve programming fundamentals.

Learning mode: ${modes[mode]}

Use clear headings, readable formatting and beginner-friendly explanations.
Use C++ for code examples when appropriate.
Keep answers focused and relevant.
Never pretend that an answer has been tested or executed.`
        },
        {
          role: "user",
          content: `Topic: ${topic}\nStudent request: ${question}`
        }
      ]
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;

      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

  } catch (error) {
    console.error("AlgoBuddy error:", error.message);

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({
        error: "The response was interrupted. Please try again."
      })}\n\n`);
      res.end();
    } else {
      res.status(500).json({
        error: "AlgoBuddy could not generate a response. Please try again."
      });
    }
  }
});

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log("AlgoBuddy AI running on port", process.env.PORT || 3000);
});
