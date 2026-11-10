
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.static("public"));

const client = new OpenAI({
  apiKey: process.env.BHARATCODE_API_KEY,
  baseURL: "https://bharatcode.ai/api/model/v1"
});

const modes = {
  learn: "Teach the requested DSA topic from beginner level. Explain the intuition, definition, working, a simple example, complexity, and applications. Use clear student-friendly language. Do not assume advanced knowledge.",

  practice: "Generate three DSA practice questions for the requested topic. Include a mix of easy and medium difficulty. Do not immediately reveal the answers. Ask the learner to attempt them.",

  evaluate: "Evaluate the student's submitted answer. Explain what is correct, identify mistakes, give constructive feedback, and show an improved answer. Be encouraging and educational.",

  ask: "Act as an interactive DSA tutor. Answer the student's question clearly with examples and step-by-step reasoning. Use C++ examples where useful."
};

app.post("/api/tutor", async (req, res) => {
  try {
    const { topic, question, mode } = req.body;

    if (!process.env.BHARATCODE_API_KEY) {
      return res.status(500).json({
        error: "API key is not configured in the server."
      });
    }

    if (!topic || !question || !modes[mode]) {
      return res.status(400).json({
        error: "Please provide a topic, question and valid learning mode."
      });
    }

    const response = await client.chat.completions.create({
      model: "qwen-3.8-27b",
      messages: [
        {
          role: "system",
          content: `You are AlgoBuddy AI, a friendly and knowledgeable Data Structures and Algorithms tutor.

Your purpose is to help college students understand DSA, practise problem-solving and improve their programming fundamentals.

Learning mode: ${modes[mode]}

Use clear headings, readable formatting and beginner-friendly explanations.
Use C++ for code examples when appropriate.
Never pretend that an answer has been tested or executed.
`
        },
        {
          role: "user",
          content: `Topic: ${topic}\nStudent request: ${question}`
        }
      ]
    });

    const answer = response.choices[0]?.message?.content;

    if (!answer) {
      throw new Error("The AI returned an empty response.");
    }

    res.json({ answer });

  } catch (error) {
    console.error("AlgoBuddy error:", error.message);

    res.status(500).json({
      error: "AlgoBuddy could not generate a response. Please try again."
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("AlgoBuddy AI running at http://localhost:3000");
});