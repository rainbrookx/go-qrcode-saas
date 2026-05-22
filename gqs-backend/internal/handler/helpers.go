package handler

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func getIntQuery(c *gin.Context, key string, defaultVal int) int {
	val := c.Query(key)
	if val == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(val)
	if err != nil || n < 1 {
		return defaultVal
	}
	return n
}

func getUint64Param(c *gin.Context, key string) uint64 {
	val := c.Param(key)
	n, _ := strconv.ParseUint(val, 10, 64)
	return n
}

func timeNow() time.Time {
	return time.Now()
}
