package auth

import (
	"fmt"
	"log/slog"
	"net/smtp"
)

type Mailer struct {
	Host string
	Port string
	User string
	Pass string
	From string
}

func NewMailer(host, port, user, pass, from string) *Mailer {
	return &Mailer{Host: host, Port: port, User: user, Pass: pass, From: from}
}

func (m *Mailer) SendVerificationCode(to, code, purpose string) error {
	subject := "登录验证码"
	if purpose == "reset_password" {
		subject = "找回密码验证码"
	}
	body := fmt.Sprintf("您的验证码是：%s，有效期 5 分钟。", code)
	return m.send(to, subject, body)
}

func (m *Mailer) send(to, subject, body string) error {
	auth := smtp.PlainAuth("", m.User, m.Pass, m.Host)
	addr := fmt.Sprintf("%s:%s", m.Host, m.Port)
	msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n%s",
		m.From, to, subject, body)

	slog.Info("sending email", "to", to, "subject", subject)
	return smtp.SendMail(addr, auth, m.From, []string{to}, []byte(msg))
}
