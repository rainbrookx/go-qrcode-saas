package model

import "time"

type RefreshToken struct {
	ID          uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint64    `gorm:"not null;index:idx_user_id" json:"user_id"`
	TokenID     string    `gorm:"uniqueKey;not null;size:64" json:"token_id"`
	ExpiresAt   time.Time `gorm:"not null" json:"expires_at"`
	Invalidated bool      `gorm:"not null;default:false" json:"invalidated"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (RefreshToken) TableName() string {
	return "tb_refresh_tokens"
}