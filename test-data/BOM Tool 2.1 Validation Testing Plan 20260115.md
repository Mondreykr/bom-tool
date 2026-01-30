BOM Tool 2.1 Validation Testing Plan

1. Flat BOM Test - use newer XML with output from newer BOM Tool
    1. Input = `258730-Rev2-20260105.XML`
    2. Validation Output = `258730-Rev2-Flat BOM-20260115.xlsx` (from BOM Tool 2.0)
    3. Claude Test = use Input to generate a new Output and compare with Validation Output
2. GA Comparison Test - using previously validated content
    1. Inputs = `258730-Rev0-AsBuilt.csv` (old bom) + `258730-Rev1-AsBuilt.csv` (new bom)
    2. Validation Output = `258730-Rev0-vs-258730-Rev1-Comparison-20251128 (from BOM Tool-2.2).xlsx` (from \258730 Cyclone\BOM Comparison 3 Test)
    3. Claude Test - use Inputs to generate new Output and compare with Validation Output.
3. GA Comparison Test - using existing XML revs from O-drive
    1. Inputs = `258754-Rev0-20251220.XML` (old bom) + `258754-Rev1-20260112.XML` (new bom)
    2. Validation Output = `258754-Rev0-vs-258754-Rev1-Comparison-20260115.xlsx`
    3. Claude Test = use Inputs to generate new Output and compare with Validation Output
4. Select Comparison Test - using existing GA XMLs, same rev, different subassembly components
    1. Inputs = 
        1. `258730-Rev2-20260105.xml` (old bom) + `258730-Rev2-20260112.xml` (new bom)
        2. `1032401-Rev1-20260105.xml` (old bom) + `1032401-Rev2-20260112.xml` (new bom)
    2. Validation Output = 
        1. Piping Comparison - `1032401-Rev1-vs-1032401-Rev2-Comparison-20260115.xlsx` (via the newer BOM Tool 2.0)
    3. Claude Test - 
        1. load both `258730` input XML files
        2. select the `1032401` assembly on both sides of the tree
        3. run the comparison on `1032401`
        4. Compare the output against the Piping Comparison output