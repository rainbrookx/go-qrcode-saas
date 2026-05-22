package shortcode

import (
	"crypto/rand"
	"math/big"
)

const (
	length = 8
	// Base62 with ambiguous chars removed: no 0 O o 1 I l
	charset = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ"
)

var charsetLen = big.NewInt(int64(len(charset)))

func Generate() (string, error) {
	code := make([]byte, length)
	for i := range code {
		n, err := rand.Int(rand.Reader, charsetLen)
		if err != nil {
			return "", err
		}
		code[i] = charset[n.Int64()]
	}
	// Fisher-Yates shuffle for non-sequential output
	shuffle(code)
	return string(code), nil
}

func shuffle(b []byte) {
	for i := len(b) - 1; i > 0; i-- {
		jBig, err := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		if err != nil {
			return
		}
		j := jBig.Int64()
		b[i], b[j] = b[j], b[i]
	}
}
