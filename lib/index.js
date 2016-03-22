process.env.DEBUG = process.env.DEBUG || "skira"

const Promise = require("bluebird")

const electron = require("electron")
const Skira = require("skira")
const serializeError = require("serialize-error")

function hookStd(std, eventName, target) {
	std.write = ((orig) => (
		function customLog(data, encoding, fd) {
			target.send(eventName, data)
			orig(data, encoding, fd)
		}
	))(std.write.bind(std))
}

electron.app.on("ready", Promise.coroutine(function* onReady() {
	var mainWindow = new electron.BrowserWindow({ width: 1024, height: 800 })

	mainWindow.loadURL(`file://${__dirname}/../app/index.html`)

	yield new Promise((resolve, reject) => {
		electron.ipcMain.on("ready", resolve)
	}).timeout(2500)

	hookStd(process.stdout, "stdout", mainWindow)
	hookStd(process.stderr, "stderr", mainWindow)

	var skira = new Skira()

	var updateScreen = setInterval(() => {
		for (var taskName in skira.tasks) {
			var task = skira.tasks[taskName]
			task.error = task.error.map(err => serializeError(err))
		}

		mainWindow.send("status", skira.tasks)
	}, 250)

	mainWindow.on("closed", () => {
		clearInterval(updateScreen)
		electron.app.quit()
	})
}))
