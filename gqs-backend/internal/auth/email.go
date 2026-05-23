package auth

import (
	"crypto/tls"
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

	if m.Port == "465" {
		return m.sendWithTLS(addr, auth, m.From, []string{to}, []byte(msg))
	}
	return smtp.SendMail(addr, auth, m.From, []string{to}, []byte(msg))
}

func (m *Mailer) sendWithTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte) error {
	tlsConfig := &tls.Config{ServerName: m.Host}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("TLS连接失败: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, m.Host)
	if err != nil {
		return fmt.Errorf("SMTP客户端创建失败: %w", err)
	}
	defer client.Quit()

	if auth != nil {
		if err = client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP认证失败: %w", err)
		}
	}

	if err = client.Mail(from); err != nil {
		return fmt.Errorf("MAIL FROM失败: %w", err)
	}
	for _, addr := range to {
		if err = client.Rcpt(addr); err != nil {
			return fmt.Errorf("RCPT TO失败: %w", err)
		}
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("DATA失败: %w", err)
	}
	_, err = w.Write(msg)
	if err != nil {
		return fmt.Errorf("写入失败: %w", err)
	}
	if err = w.Close(); err != nil {
		return fmt.Errorf("关闭失败: %w", err)
	}

	return nil
}
