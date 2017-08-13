
const {
	readdir: fsReaddirCb,
	readFile: fsReadFileCb
} = require('fs')
const {
	dirname: pathDirnameSync,
	resolve: pathResolveSync,
	join: pathJoinSync
} = require('path')
const { promisify } = require('util')

const fsReaddir = promisify(fsReaddirCb)
const fsReadFile = promisify(fsReadFileCb)
const pathDirname = path => Promise.resolve(pathDirnameSync(path))
const pathResolve = path => Promise.resolve(pathResolveSync(path))
const pathJoin = (...args) => Promise.resolve(pathJoinSync.apply(pathJoinSync, args))
const parseJson = json => Promise.resolve(JSON.parse(json))

const { Server } = require('hapi')
const Good = require('good')

const port = '9956'

const server = new Server()
server.connection({ port })
server.register({
	register: Good,
	options: {
		reporters: {
			consoleReporter: [{
				module: 'good-squeeze',
				name: 'Squeeze',
				args: [{
					log: '*',
					response: '*'
				}]
			}, {
				module: 'good-console'
			}, 'stdout']
		}
	}
})
server.route({
	method: 'GET',
	path: '/repos/ironman9967/{repo}/releases/latest',
	handler: ({ params: { repo } }, reply) =>
		pathDirname(__dirname)
			.then(fsReaddir)
			.then(repos => repos.reduce((foundRepoDir, repoDir) =>
				!foundRepoDir && repoDir == repo
					? repoDir
					: foundRepoDir,
				void 0))
			.then(foundRepoDir => {
				if (!foundRepoDir)
					throw new Error(`${repo} not found, please clone repo`)
				pathResolve(`../${foundRepoDir}`)
					.then(foundRepoDir => pathJoin(foundRepoDir, 'package.json'))
					.then(fsReadFile)
					.then(parseJson)
					.then(({ version }) => ({
						tag_name: `v${version}`,
						tarball_url: 'https://api.github.com/repos/ironman9967/'
							+ `${repo}/tarball/v${version}`
					}))
					.then(res => {
						reply(res)
						server.log('response', res)
					})
			})
})
server.route({
	method: 'GET',
	path: '/repos/creationix/nvm/releases/latest',
	handler: (req, reply) => {
		reply({
			tag_name: 'v0.33.2',
			tarball_url: 'https://api.github.com/repos/creationix/nvm/tarball/v0.33.2'
		})
	}
})
server.start(err => {
	if (err) throw err
	server.log(`server up - http://localhost:${port}`)
})
