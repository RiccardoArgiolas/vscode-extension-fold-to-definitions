// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) 
{
	let comments: vscode.Range[] = [];

	let disposable = vscode.commands.registerCommand('fold-to-definitions.foldToDefinitions', () => 
	{
		FoldToDefinitionsAsync();
    });
    context.subscriptions.push(disposable);

	function IsCommented(_pos : vscode.Position) : boolean
	{
		for (let index = 0; index < comments.length; index++) 
		{			
			if(_pos.isAfter(comments[index].start) && _pos.isBefore(comments[index].end))
				return true;
		}

		return false;
	}

	async function FoldToDefinitionsAsync()
	{
		//utilities
		const activeEditor = vscode.window.activeTextEditor;
		const document = activeEditor.document;
		const text = document.getText();
		let match;
		const originalSelection = activeEditor.selection;
		const configuration = vscode.workspace.getConfiguration('foldToDefinitions');

		//find comments
		comments = [];
		const regExBlock = /\/\*[\s\S]*?\*\//g;
		const regExLine = /\/\/.*/g;
		
		//look for comment blocks
		while (match = regExBlock.exec(text)) 
		{
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			const range = new vscode.Range(startPos, endPos);

			comments.push(range);
		}

		//look for comment lines
		while (match = regExLine.exec(text)) 
		{
			const startPos = document.positionAt(match.index);
			const endPos = document.positionAt(match.index + match[0].length);
			const range = new vscode.Range(startPos, endPos);

			comments.push(range);
		}

		//unfold recursively (if enabled in the options)
		if(configuration.get("unfoldFirst", false))
		{
			//find classes
			const regExClasses = /\W+class\s+\S+/g;

			while (match = regExClasses.exec(text)) 
			{
				const startPos = document.positionAt(match.index);

				if(!IsCommented(startPos))
				{
					activeEditor.selection = new vscode.Selection(startPos.line, 0, startPos.line, 0);
					await vscode.commands.executeCommand('editor.unfoldRecursively');
				}
			}
		}

		//fold properties
		if(configuration.get("foldProperties", false))
		{
			const regExProperties = /\w+\s+\w+\s+{\s*(get|set)\s*{/g;

			while (match = regExProperties.exec(text)) 
			{
				const startPos = document.positionAt(match.index);

				if(!IsCommented(startPos))
				{
					activeEditor.selection = new vscode.Selection(startPos.line, 0, startPos.line, 0);
					await vscode.commands.executeCommand('editor.fold');
				}
			}
		}

		//fold method summaries
		if(configuration.get("foldSummaries", false))
		{
			const regExSummaries = /\/\/\/\s*<summary>[\w\W]*?<\/summary>/g;

			while (match = regExSummaries.exec(text)) 
			{
				const startPos = document.positionAt(match.index);

				activeEditor.selection = new vscode.Selection(startPos.line, 0, startPos.line, 0);
				await vscode.commands.executeCommand('editor.fold');
			}
		}
			
		//fold all methods
		//const regExMethods = /[\w,.<>\[\]]+[ \t]+\w+[ \t]*\([\w \t,.<>\[\]]*\)[ \t]*[\n\r]/g;

		//new regex: exlcudes "new", "if" keywords, includes everything between parentheses
		const regExMethods = /\s(?!new[ \t])[\w,.<>\[\]]+[ \t]+(?!if[ \t\(])\w+[ \t]*\(.*\)[ \t]*[\n\r]/g;

		while (match = regExMethods.exec(text)) 
		{
			const startPos = document.positionAt(match.index);

			if(!IsCommented(startPos))
			{
				activeEditor.selection = new vscode.Selection(startPos.line, 0, startPos.line, 0);
				await vscode.commands.executeCommand('editor.fold');
			}
		}

		//fold all regions
		const regExRegions = /#region/g;

		while (match = regExRegions.exec(text)) 
		{
			const startPos = document.positionAt(match.index);

			if(!IsCommented(startPos))
			{
				activeEditor.selection = new vscode.Selection(startPos.line, 0, startPos.line, 0);
				await vscode.commands.executeCommand('editor.fold');
			}
		}

		//restore selection
		if(configuration.get("retainSelection", true))
			activeEditor.selection = originalSelection;
		else
			activeEditor.selection = new vscode.Selection(0, 0, 0, 0);
	}
}
