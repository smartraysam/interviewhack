package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"

	"github.com/gofiber/fiber/v2"
	openai "github.com/sashabaranov/go-openai"
)

// TranscribeHandler accepts a multipart audio file and returns a transcript via Whisper.
// POST /api/transcribe  (multipart/form-data, field: "audio")
//
// This endpoint is only used when SPEECH_MODE=whisper (set in backend .env).
// When SPEECH_MODE=browser, the frontend uses the Web Speech API directly
// and this endpoint is never called.
func TranscribeHandler(c *fiber.Ctx) error {
	// Guard: only active in whisper mode
	speechMode := os.Getenv("SPEECH_MODE")
	if speechMode != "" && speechMode != "whisper" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Transcription endpoint is disabled. Set SPEECH_MODE=whisper to enable.",
		})
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "OPENAI_API_KEY is not configured",
		})
	}

	// Parse the uploaded audio file
	file, err := c.FormFile("audio")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Missing 'audio' field in form data",
		})
	}

	// Size guard: Whisper API limit is 25 MB
	const maxBytes = 25 * 1024 * 1024
	if file.Size > maxBytes {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{
			"error": fmt.Sprintf("Audio file too large: %d bytes (max 25 MB)", file.Size),
		})
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to open uploaded file",
		})
	}
	defer src.Close()

	audioBytes, err := io.ReadAll(src)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read uploaded file",
		})
	}

	// Call OpenAI Whisper via multipart form (go-openai does not yet expose
	// a direct stream-from-bytes API, so we build the request manually)
	transcript, err := callWhisperAPI(apiKey, audioBytes, file.Filename)
	if err != nil {
		log.Printf("Whisper API error: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Transcription failed: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"transcript": transcript,
	})
}

// callWhisperAPI sends audio bytes to OpenAI Whisper and returns the transcript.
func callWhisperAPI(apiKey string, audio []byte, filename string) (string, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	// model field
	if err := writer.WriteField("model", string(openai.Whisper1)); err != nil {
		return "", err
	}

	// language hint (English) — optional but speeds up transcription
	if err := writer.WriteField("language", "en"); err != nil {
		return "", err
	}

	// audio file field
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}
	if _, err := io.Copy(part, bytes.NewReader(audio)); err != nil {
		return "", err
	}
	writer.Close()

	req, err := http.NewRequestWithContext(
		context.Background(),
		http.MethodPost,
		"https://api.openai.com/v1/audio/transcriptions",
		&body,
	)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Whisper API returned %d: %s", resp.StatusCode, string(respBytes))
	}

	var result struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return "", fmt.Errorf("failed to parse Whisper response: %w", err)
	}

	return result.Text, nil
}
