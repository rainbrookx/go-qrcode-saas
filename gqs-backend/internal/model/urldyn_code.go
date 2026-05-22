package model

import "time"

type UrldynCode struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"not null;index:idx_user_id" json:"user_id"`
	Code      string    `gorm:"uniqueKey;not null;size:8" json:"code"`
	TargetURL string    `gorm:"not null;size:2048" json:"target_url"`
	ExpiresAt time.Time `gorm:"not null;index:idx_expires_at" json:"expires_at"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (UrldynCode) TableName() string {
	return "tb_urldyn_codes"
}