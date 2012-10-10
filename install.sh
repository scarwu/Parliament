#!/bin/sh

sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install libmysqlclient-dev

npm install mysql-libmysqlclient
npm install node-uuid