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

const newAsync = Promise.coroutine(function* newAsync(fn, ...args) {
	let base = Object.create(fn.prototype || fn)
	let out = (yield Promise.resolve(fn.apply(base, args))) || base

	return out
})

electron.app.on("ready", Promise.coroutine(function* onReady() {
	var mainWindow = new electron.BrowserWindow({ width: 1024, height: 800 })

	mainWindow.loadURL(`file://${__dirname}/../app/index.html`)

	yield new Promise((resolve, reject) => {
		electron.ipcMain.on("ready", resolve)
	}).timeout(2500)

	hookStd(process.stdout, "stdout", mainWindow)
	hookStd(process.stderr, "stderr", mainWindow)

	var skira = yield newAsync(Skira)

	var updateScreen = setInterval(() => {
		var tasks = {}

		for (var taskName in skira.tasks) {
			var source = skira.tasks[taskName]

			var cleanTask = {
				error: (source.error || []).map(serializeError),
				lastupdate: source.lastupdate,
				busy: source.triggers && source.triggers.restart ? !source.busy : source.busy,
				lastexec: source.lastexec,
			}

			tasks[taskName] = cleanTask
		}

		mainWindow.send("status", tasks)
	}, 250)

	mainWindow.on("closed", () => {
		clearInterval(updateScreen)
		electron.app.quit()
	})
}))
