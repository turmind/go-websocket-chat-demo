package main

import (
	"net/http"
	"os"
	"time"

	"github.com/heroku/x/hredis/redigo"
	"github.com/sirupsen/logrus"
)

var (
	waitTimeout = time.Minute * 10
	log         = logrus.WithField("cmd", "go-websocket-chat-demo")
	rr          redisReceiver
	rw          redisWriter
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}
	redisPool, err := redigo.NewRedisPoolFromURL(redisURL)
	if err != nil {
		log.WithField("url", redisURL).Fatal("Unable to create Redis pool")
	}

	rr = newRedisReceiver(redisPool)
	rw = newRedisWriter(redisPool)

	go func() {
		for {
			waited, err := redigo.WaitForAvailability(redisURL, waitTimeout, rr.wait)
			if !waited || err != nil {
				log.WithFields(logrus.Fields{"waitTimeout": waitTimeout, "err": err}).Fatal("Redis not available by timeout!")
			}
			rr.broadcast(availableMessage)
			err = rr.run()
			if err == nil {
				break
			}
			log.WithField("err", err).Error("Redis receiver error, reconnecting in 5 seconds...")
			time.Sleep(5 * time.Second)
		}
	}()

	go func() {
		for {
			waited, err := redigo.WaitForAvailability(redisURL, waitTimeout, nil)
			if !waited || err != nil {
				log.WithFields(logrus.Fields{"waitTimeout": waitTimeout, "err": err}).Fatal("Redis not available by timeout!")
			}
			err = rw.run()
			if err == nil {
				break
			}
			log.WithField("err", err).Error("Redis writer error, reconnecting in 5 seconds...")
			time.Sleep(5 * time.Second)
		}
	}()

	http.Handle("/", http.FileServer(http.Dir("./public")))
	http.HandleFunc("/ws", handleWebsocket)
	log.Println(http.ListenAndServe(":"+port, nil))
}
