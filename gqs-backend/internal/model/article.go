package model

import "time"

type Article struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID    uint64    `gorm:"not null;index:idx_user_id" json:"user_id"`
	Code      string    `gorm:"uniqueKey;not null;size:8" json:"code"`
	Title     string    `gorm:"not null;size:200" json:"title"`
	Content   string    `gorm:"not null;type:mediumtext" json:"content"`
	ExpiresAt time.Time `gorm:"not null;index:idx_expires_at" json:"expires_at"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

func (Article) TableName() string {
	return "tb_articles"
}