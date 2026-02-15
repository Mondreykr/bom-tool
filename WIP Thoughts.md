Thought 1


Testing
See Test Suite 1 in Notion https://www.notion.so/amcallister/BOM-Tool-2-2-Development-3051f1f4a45480b0abbbe2d9be767ad8?source=copy_link#3071f1f4a454807fa0bce1319fcf27fa
All the test notes are there under each test phase.



- naming the state of the file in the error would be helpful, e.g., "... WIP ([FileState]) ...
- errors should always start with the file path before " : [description]" rather than [description] before file path. E.g., I don't want "Missing NS Item Type on at 258758 > 1035158 > 1035167 > — cannot validate without knowing node type". I'd rather have the "Missing NS..." put together with the rest of the description after the file path.
- the source export and prior IFP artifact should flip sides. Prior is always the previous, source XML is the new, old to new left to right.
- can I see the BOM from the json when I first load it? then I can see it before I drop in the new XML. 

- IFP revision thought it was still REV0 even though I had uploaded a json at IFP REV0 and an XML (at REV1 though it shouldn't matter). I think it should auto increment 1 up from the JSON loaded.

- the test file `258758-Rev3-20260205.XML` gave an error "Missing NS Item Type on at 258758 > 1035158 > 1035167 > — cannot validate without knowing node type" But the XML seems fine at that point. Why is it being flagged? The same file also gave the error "258758 > 1035158 > 1035167 > : Released assembly has no released content — all sub-assemblies are WIP". I looked at the XML and sure enough the parent was missing its Part Number and some other fields. It's the parent of these items with pdmweid = 
132439
132441
132522
132522
so I guess it found blank assembly items which is good. It recognized the structure and still produced the structure, but it's pointing out the wrong errors. You can investigate the XML to see for yourself. The NS Item Type is actually there. But the Part Number and Revision and Description are empty, as well as the XML's `id=` field. So I think it was probably true that all the assembly items were WIP because they did not have a proper state since they were empty. 

- Is the source column supposed to be empty always? What goes in the source column and when? I think it should always be filled for each line, that way you can see. 
Change the Source column in the merged tree view to show three distinct labels instead of blank/"B(n-1)":
  - Current — Passed-through nodes (released assemblies from X(n))
  - Prior — Grafted nodes (WIP assemblies swapped with B(n-1) version)
  - No Prior — Placeholder nodes (WIP assemblies with no prior release)

- warnings and rule violations should have warning messages - so a suite of warning messages that match the rules is important. And it means all the rules in the validation-logic.md should be accurate with the code.





Features
- Upon initial file load, I want to see the actual State name (Issued for Use or Issued for Purchasing or Under Revision etc.) but still keeping the green/red pill based on state group (Released vs WIP). Or actually, even better, I want a toggle so that the State column can be switched from the default showing either RELEASED or WIP to the actual state name.

- I want a Reset button on IFP Merge tab (basically restores to unmerged with files uploaded)


Later Features
- I want to be able to hover my cursor over any field or card that isn't "self-evident" in its meaning and have a clear and plain explanation pop up that would help people who know PDM but don't understand what's going on here and this tool is new. So you'll have to help me figure out what those fields areas of the UI are and so on.
- I'd like a help section that pops down or open or something that explains things real simply for someone new, what it is, what things mean, steps etc. Succint.