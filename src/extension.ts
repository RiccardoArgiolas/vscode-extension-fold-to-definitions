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

	function FoldToDefinitionsAsync()
	{
		const configuration = vscode.workspace.getConfiguration('foldToDefinitions');
		const activeEditor = vscode.window.activeTextEditor;
		
		SymbolsMethodFolding(activeEditor, configuration);
		//TextMethodFolding(activeEditor, configuration);	
	}

	async function TextMethodFolding(activeEditor: vscode.TextEditor, configuration: vscode.WorkspaceConfiguration)
	{
		//utilities
		const originalSelection = activeEditor.selection;
		const document = activeEditor.document;
		const text = document.getText();
		let match;

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
			const regExProperties = /\S*\s+\w+\s*{\s*(get|set)\s*{/g;

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
		const regExMethods = /\s(?!new[ \t])[\w,.<>\[\]]+[ \t]+(?!if[ \t\(])\w+[ \t]*\(.*\)/g;

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

		//fold classes that don't match filename
		const regExClasses = /class\s+\S+/g;

		while (match = regExClasses.exec(text)) 
		{
			//get the filename from the path (document.filename only gets the path, so we use a regex to retrieve the actual filename)
			const regExFilename = /\w*(?=\.cs)/g;
			const filename = regExFilename.exec(document.fileName);

			//if class name is included in the class we just found in the text...
			if(!(match[0] as string).includes(filename[0]))
			{
				const startPos = document.positionAt(match.index);

				if(!IsCommented(startPos))
				{
					activeEditor.selection = new vscode.Selection(startPos.line, 0, startPos.line, 0);
					await vscode.commands.executeCommand('editor.fold');
				}
			}
		}

		SetSelection(activeEditor, configuration, originalSelection);
	}

	//this function simply executes the symbol provider and waits for it to be done, then it creates an array with all the symbols and calls the folding method
	function SymbolsMethodFolding(activeEditor: vscode.TextEditor, configuration: vscode.WorkspaceConfiguration)
	{
		//populate array with all symbols
		vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", vscode.window.activeTextEditor.document.uri).then
		(
			function (symbols: vscode.DocumentSymbol[]) 
			{
				//the "symbols" variable contains all the symbols! everything else (apart from the main class) they're stored in the "children" array
				let allSymbols: vscode.DocumentSymbol[] = [];
				PopulateAllSymbols(symbols, allSymbols);
				FoldUsingSymbols(activeEditor, configuration, allSymbols);
			}
		);
	}

	//creates an array with all the symbols in the document
	function PopulateAllSymbols(symbols: vscode.DocumentSymbol[], output: vscode.DocumentSymbol[])
	{
		for (var _i = 0; _i < symbols.length; _i++)
		{
			output.push(symbols[_i]);

			if(symbols[_i].children.length > 0)
				PopulateAllSymbols(symbols[_i].children, output);
		}
	}

	//folds code
	async function FoldUsingSymbols(activeEditor: vscode.TextEditor, configuration: vscode.WorkspaceConfiguration, allSymbols: vscode.DocumentSymbol[])
	{
		//utilities
		const originalSelection = activeEditor.selection;
		const document = activeEditor.document;
		const text = document.getText();
		let match;

		//unfold recursively (if enabled in the options) on each class
		if(configuration.get("unfoldFirst", false))
		{
			//find classes
			for (var _i = 0; _i < allSymbols.length; _i++)
			{
				if(allSymbols[_i].kind == vscode.SymbolKind.Class)
				{
					activeEditor.selection = new vscode.Selection(allSymbols[_i].selectionRange.start, allSymbols[_i].selectionRange.end);
					await vscode.commands.executeCommand('editor.unfoldRecursively');
				}
			}
		}

		//fold properties
		if(configuration.get("foldProperties", false))
		{
			//find properties
			for (var _i = 0; _i < allSymbols.length; _i++)
			{
				if(allSymbols[_i].kind == vscode.SymbolKind.Property)
				{
					activeEditor.selection = new vscode.Selection(allSymbols[_i].selectionRange.start, allSymbols[_i].selectionRange.end);
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

		//fold methods
		//find methods
		for (var _i = 0; _i < allSymbols.length; _i++)
		{
			if(allSymbols[_i].kind == vscode.SymbolKind.Method)
			{
				activeEditor.selection = new vscode.Selection(allSymbols[_i].selectionRange.start, allSymbols[_i].selectionRange.end);
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

		//fold classes except for first one
		//find classes
		let firstClassSkipped: boolean = false;

		for (var _i = 0; _i < allSymbols.length; _i++)
		{
			if(allSymbols[_i].kind == vscode.SymbolKind.Class)
			{
				if(!firstClassSkipped)
					firstClassSkipped = true;
				else
				{
					activeEditor.selection = new vscode.Selection(allSymbols[_i].selectionRange.start, allSymbols[_i].selectionRange.end);
					await vscode.commands.executeCommand('editor.fold');
				}
			}
		}

		SetSelection(activeEditor, configuration, originalSelection);
	}

	function SetSelection(activeEditor: vscode.TextEditor, configuration: vscode.WorkspaceConfiguration, originalSelection: vscode.Selection)
	{
		//restore selection
		if(configuration.get("retainSelection", true))
			activeEditor.selection = originalSelection;
		else
			activeEditor.selection = new vscode.Selection(0, 0, 0, 0);

		//set vertical scroll to keep selection at top
		activeEditor.revealRange(new vscode.Range(activeEditor.selection.start, activeEditor.selection.end), vscode.TextEditorRevealType.InCenter);
	}
}
