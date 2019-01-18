# Fold to Definitions (C#)

Folds/collapses C# code to definitions

## How to Use

Use Ctrl+Shift+P to open the command palette and search for the command "Fold to C# definitions"

Additional options:

* `foldToDefinitions.useSymbolsMethod`: If true, uses executeDocumentSymbolProvider instead of instead of regExs to find classes/methods/properties and fold them (it is recommended to have this set to true)
* `foldToDefinitions.unfoldFirst`: If true, executes an unfold recursively command before folding to definitions
* `foldToDefinitions.foldProperties`: If true, also fold properties	
* `foldToDefinitions.foldSummaries`: If true, also folds summaries (ie: method comments with summary tags, see gif below)
* `foldToDefinitions.retainSelection`: If true, the selection at the moment of executing the command is retained (causes some folded parts of code to be re-opened if you were selecting anything inside them)


![Usage](images/foldToDefinitions.gif)