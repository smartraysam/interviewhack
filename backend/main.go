package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"

	"interviewhack-backend/handlers"
)

func main() {
	// Load .env if present (non-fatal if missing — use real env vars in prod)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	app := fiber.New(fiber.Config{
		// Increase body limit for audio uploads (Whisper)
		BodyLimit: 30 * 1024 * 1024, // 30 MB
	})

	// ── Middleware ──────────────────────────────────────────────────────────
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: getAllowedOrigins(),
		AllowMethods: "GET,POST,OPTIONS",
		AllowHeaders: "Content-Type,Accept,Authorization",
	}))

	// ── Routes ──────────────────────────────────────────────────────────────
	api := app.Group("/api")
	api.Get("/health", healthHandler)
	api.Post("/answer", handlers.AnswerHandler)
	api.Post("/transcribe", handlers.TranscribeHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 InterviewHack backend running on :%s", port)
	log.Fatal(app.Listen(":" + port))
}

func healthHandler(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "ok",
		"version": "1.0.0",
	})
}

// getAllowedOrigins returns CORS allowed origins, defaulting to Vite dev server.
func getAllowedOrigins() string {
	if origin := os.Getenv("ALLOWED_ORIGINS"); origin != "" {
		return origin
	}
	return "http://localhost:5173,http://localhost:4173"
}
