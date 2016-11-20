'use strict';

const chalk = require('chalk');
const inquirer = require('inquirer');
const execa = require('execa');
const pathExists = require('path-exists');

class GitmojiCli {

	constructor(gitmojiApiClient, gitmojis) {
		this._gitmojiApiClient = gitmojiApiClient;
		this._gitmojis = gitmojis;
	}

	list() {
		return this._gitmojiApiClient.request({
			method: 'GET',
			url: '/src/data/gitmojis.json'
		}).then(res => res.data.gitmojis)
			.then(gitmojis => this._parseGitmojis(gitmojis))
			.catch(err => console.error(chalk.red(`ERROR: gitmoji list not found - ${err.code}`)));
	}

	search(name) {
		return this._gitmojiApiClient.request({
			method: 'GET',
			url: '/src/data/gitmojis.json'
		}).then(res => res.data.gitmojis)
			.then(gitmojis => gitmojis.filter(gitmoji => gitmoji.name.concat(gitmoji.description).indexOf(name) !== -1))
			.then(gitmojisFiltered => this._parseGitmojis(gitmojisFiltered))
		.catch(err => console.error(chalk.red(`ERROR: ${err.code}`)));
	}

	ask() {
		if (this._isAGitRepo('.git')) {
			return this._gitmojiApiClient.request({
				method: 'GET',
				url: '/src/data/gitmojis.json'
			}).then(res => res.data.gitmojis)
				.then(gitmojis => this._questions(gitmojis))
				.then(questions => {
					inquirer.prompt(questions).then(answers => {
						this._commit(answers);
					});
				})
			.catch(err => console.error(chalk.red(`ERROR: ${err.code}`)));
		}

		console.error(chalk.red('ERROR: This directory is not a git repository.'));
	}

	_commit(answers) {
		const commitTitle = `${answers.gitmoji} ${answers.title}`;
		const reference = (answers.reference) ? `#${answers.reference}` : '';
		const signed = this._isCommitSigned(answers.signed);
		const commitBody = `${answers.message} ${reference}`;

		execa.stdout('git', ['add', '.'])
			.then(res => console.log(chalk.blue(res)))
			.catch(err => console.error(chalk.red(`ERROR: ${err.stderr}`)));
		execa.shell(`git commit ${signed} -m "${commitTitle}" -m "${commitBody}"`)
			.then(res => console.log(chalk.blue(res.stdout)))
			.catch(err => console.error(chalk.red(`ERROR: ${err.stderr}`)));
	}

	_questions(gitmojis) {
		const questions = [
			{
				name: 'gitmoji',
				message: 'Choose a gitmoji',
				type: 'list',
				choices: gitmojis.map(gitmoji => {
					return {
						name: `${gitmoji.emoji}  - ${gitmoji.description}`,
						value: gitmoji.code
					};
				})
			},
			{
				name: 'title',
				message: 'Enter the commit title',
				validate(value) {
					if (value === '') {
						return chalk.red('Enter the commit title');
					}
					return true;
				}
			},
			{
				name: 'message',
				message: 'Enter the commit message'
			},
			{
				name: 'reference',
				message: 'Issue / PR reference #',
				validate(value) {
					if (value === '') {
						return true;
					}
					if (value !== null) {
						const validReference = value.match(/(^[1-9][0-9]*)+$/);
						if (validReference) {
							return true;
						}
						return chalk.red('Enter the number of the reference without the #. Eg: 12');
					}
				}
			},
			{
				name: 'signed',
				message: 'Signed commit',
				type: 'confirm'
			}
		];

		return questions;
	}

	_parseGitmojis(gitmojis) {
		return gitmojis.map(gitmoji => {
			console.log(`${gitmoji.emoji}  - ${chalk.blue(gitmoji.code)} - ${gitmoji.description}`);
		});
	}

	_isCommitSigned(sign) {
		let signed;

		if (sign) {
			signed = '-s';
		} else {
			signed = '';
		}

		return signed;
	}

	_isAGitRepo(dir) {
		return pathExists.sync(dir);
	}
}

module.exports = GitmojiCli;