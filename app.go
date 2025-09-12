package main

import (
	"context"
)

// App struct
type App struct {
	ctx context.Context
}

// creates a new App application struct
func NewApp() *App {
	return &App{}
}

// context is saved when it runs every time
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}
