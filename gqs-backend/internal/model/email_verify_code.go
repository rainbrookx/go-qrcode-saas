package model

import "time"

type EmailVerifyCode struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement" json:"id"`
	Email     string    `gorm:"not null;size:254;index:idx_email_purpose" json:"email"`
	Code      string    `gorm:"not null;size:6;index:idx_email_code" json:"code"`
	Purpose   string    `gorm:"not null;size:20" json:"purpose"` // login, reset_password
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	Used      bool      `gorm:"not null;default:false" json:"used"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

func (EmailVerifyCode) TableName() string {
	return "tb_email_verify_codes"
}