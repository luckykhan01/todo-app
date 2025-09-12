package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	svc, err := NewTodoService()
	if err != nil {
		log.Fatal(err)
	}

	if err := wails.Run(&options.App{
		Title:     "Wails Todo",
		Width:     960,
		Height:    700,
		OnStartup: svc.startup,
		Bind:      []interface{}{svc},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
	}); err != nil {
		log.Fatal(err)
	}
}
