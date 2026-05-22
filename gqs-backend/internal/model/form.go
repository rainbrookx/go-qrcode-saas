package model

import (
	"database/sql"
	"time"
)

type Form struct {
	ID             uint64         `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID         uint64         `gorm:"not null;index:idx_user_id" json:"user_id"`
	Code           string         `gorm:"uniqueKey;not null;size:8" json:"code"`
	Title          string         `gorm:"not null;size:200" json:"title"`
	Fields         string         `gorm:"not null;type:json" json:"fields"` // JSON string
	MaxSubmissions sql.NullInt64  `gorm:"default:null" json:"max_submissions"`
	Deadline       sql.NullTime   `gorm:"default:null" json:"deadline"`
	ExpiresAt      time.Time      `gorm:"not null;index:idx_expires_at" json:"expires_at"`
	CreatedAt      time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time      `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Form) TableName() string {
	return "tb_forms"
}