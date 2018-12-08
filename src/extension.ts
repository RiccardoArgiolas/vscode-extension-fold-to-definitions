// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) 
{
	let activeEditor = vscode.window.activeTextEditor;
	let comments: vscode.Range[] = [];

	let disposable = vscode.commands.registerCommand('fold-to-definitions.foldToDefinitions', () => 
	{
		//utilities
		const document = activeEditor.document;
		const text = document.getText();
		let match;
		const originalSelection = activeEditor.selection;

		//find comments
		comments = [];
		const regExBlock = /\/\*[\s\S]*?\*\//g;
		const regExLine = /\/\/.*/g;
		
		//look for comment blocks
		while (match = regExBlock.exec(text)) 
		{
			const startPos = activeEditor.document.positionAt(match.index);
			const endPos = activeEditor.document.positionAt(match.index + match[0].length);
			const range = new vscode.Range(startPos, endPos);

			comments.push(range);
		}

		//look for comment lines
		while (match = regExLine.exec(text)) 
		{
			const startPos = activeEditor.document.positionAt(match.index);
			const endPos = activeEditor.document.positionAt(match.index + match[0].length);
			const range = new vscode.Range(startPos, endPos);

			comments.push(range);
		}

		//fold all methods
		const regExMethods = /\w+[ \t]+\w+[ \t]*\([\w \t]*\)[ \t]*[\n\r]/g;
		
		while (match = regExMethods.exec(text)) 
		{
			const startPos = activeEditor.document.positionAt(match.index);

			if(!IsCommented(startPos))
			{
				activeEditor.selection = new vscode.Selection(startPos.line, 0, startPos.line, 0);
				vscode.commands.executeCommand('editor.fold');
			}
		}

		//fold all regions
		const regExRegions = /#region/g;

		while (match = regExRegions.exec(text)) 
		{
			const startPos = activeEditor.document.positionAt(match.index);

			if(!IsCommented(startPos))
			{
				activeEditor.selection = new vscode.Selection(startPos.line, 0, startPos.line, 0);
				vscode.commands.executeCommand('editor.fold');
			}
		}

		//restore selection
		activeEditor.selection = originalSelection;
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
}
