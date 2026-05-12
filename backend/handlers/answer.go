package handlers

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
	openai "github.com/sashabaranov/go-openai"
)

// AnswerRequest is the JSON body for POST /api/answer
type AnswerRequest struct {
	Question string `json:"question"`
}

// systemPrompt instructs the model to auto-detect interview type and answer concisely.
const systemPrompt = `You are an expert interview coach and senior software engineer.
The user will ask you a question they received in a real-time job interview.

Your job is to:
1. Automatically detect the question type (Technical, Behavioral/STAR, System Design, or General).
2. Begin your response with a short label on the first line, e.g.: [Type: Technical]
3. Provide a clear, confident, and well-structured answer that the candidate can read out loud.

Guidelines per type:
- **Technical**: Give the precise answer with code snippets or pseudocode if helpful. Keep it concise (< 200 words).
- **Behavioral/STAR**: Structure the answer using Situation → Task → Action → Result. Be specific and results-oriented.
- **System Design**: Outline the high-level architecture in bullet points. Mention trade-offs, scalability, and key components.
- **General**: Be professional, authentic, and succinct.

Write as if the candidate is speaking — natural, confident, not robotic. Avoid filler phrases like "Great question!".`

// AnswerHandler streams GPT-4o tokens back as Server-Sent Events.
// POST /api/answer  { "question": "..." }
func AnswerHandler(c *fiber.Ctx) error {
	var req AnswerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	question := strings.TrimSpace(req.Question)
	if question == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Question cannot be empty",
		})
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "OPENAI_API_KEY is not configured",
		})
	}

	client := openai.NewClient(apiKey)

	// Set SSE headers
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no") // Disable nginx buffering if behind proxy

	// Stream response
	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		ctx := context.Background()

		stream, err := client.CreateChatCompletionStream(
			ctx,
			openai.ChatCompletionRequest{
				Model: openai.GPT4o,
				Messages: []openai.ChatCompletionMessage{
					{Role: openai.ChatMessageRoleSystem, Content: systemPrompt},
					{Role: openai.ChatMessageRoleUser, Content: question},
				},
				MaxTokens:   1024,
				Temperature: 0.7,
				Stream:      true,
			},
		)
		if err != nil {
			log.Printf("OpenAI stream error: %v", err)
			writeSSEError(w, "Failed to connect to AI service")
			return
		}
		defer stream.Close()

		for {
			response, err := stream.Recv()
			if err == io.EOF {
				// Signal stream end
				fmt.Fprintf(w, "event: done\ndata: [DONE]\n\n")
				w.Flush()
				return
			}
			if err != nil {
				log.Printf("Stream recv error: %v", err)
				writeSSEError(w, "Stream interrupted")
				return
			}

			delta := response.Choices[0].Delta.Content
			if delta == "" {
				continue
			}

			// Encode as JSON to safely handle newlines and special chars
			payload, _ := json.Marshal(delta)
			fmt.Fprintf(w, "event: token\ndata: %s\n\n", payload)
			w.Flush()
		}
	})

	return nil
}

func writeSSEError(w *bufio.Writer, msg string) {
	payload, _ := json.Marshal(fiber.Map{"error": msg})
	fmt.Fprintf(w, "event: error\ndata: %s\n\n", payload)
	w.Flush()
}
