#!/usr/bin/env node
const electronPath = require("electron-prebuilt")
const spawn = require("child_process").spawn

var args = process.argv.slice(2)
args.unshift(__dirname + "/../lib")

spawn(electronPath, args, { stdio: "inherit" })
