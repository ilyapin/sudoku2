class Utils{
	static isGreySqr(index){
		const x = index / 9;
		const y = index % 9;
		const greySqrs = [[0,3],[3,0],[3,6],[6,3]];
		for(let i=0; i<greySqrs.length; i++){
			const sqr = greySqrs[i];
			// console.log(sqr);
			if (x>=sqr[0] && x<(sqr[0]+3) && y>=sqr[1] && y<(sqr[1]+3))
				return true;
		}
		return false;
	}
	static handleFetchErrors(response) {
		if (!response.ok) 
			throw Error(response.statusText);
		return response;
	}
	static fetchSudokusrv(method, params, callbackOnSuccess){
		if (!method)
			throw Error('fetchSudokusrv !method');
		let opt = null;
		let url = "https://print2flash.com/ilya/sudoku/srv/?method=" + method;
		if (params){
			let data = new FormData();
			for (const paramName in params)
				data.append(paramName, params[paramName]);
			opt = {
				method: "POST",
				body: data
			};
		}
		
		fetch(url, opt)
		.then(this.handleFetchErrors)
		.then((res) => { return res.json(); })
		.then((data)=> {
			console.log(data);
			if (data.result){
				callbackOnSuccess(data);
			} else 
				throw Error(data.error);
		})
		.catch((error) => {
			console.log(error);				
		});
	}
}

class SudokuIdx{
	constructor() {
		this.idxByRow = Array(9);
		for (let i=0; i<9; i++){
			let a = [];
			// by row
			for(let k=0; k<9; k++){
				a.push(i*9 + k);
			}
			// result
			this.idxByRow[i] = a;
		}
		this.idxByCol = Array(9);
		for (let i=0; i<9; i++){
			let a = [];
			// by col
			for(let k=0; k<9; k++){
				a.push(k*9 + i);
			}
			// result
			this.idxByCol[i] = a;
		}

		this.idxBySqr = Array(9);
		for (let i=0; i<9*9; i++){
			let sqr = this.getSqrByIndex(i);
			let a = this.idxBySqr[sqr];
			if (!a)
				a = [];
			a.push(i);
			this.idxBySqr[sqr] = a;
		}

		// for (let i=0;i<9;i++) // row
		// 	console.log(this.idxByRow[i].toString());		
		// console.log("-- by cols - ");
		// for (let i=0;i<9;i++) // col
		// 	console.log(this.idxByCol[i].toString());
		// console.log("-- by sqr - ");
		// for (let i=0;i<9;i++) // sqr
		// 	console.log(this.idxBySqr[i].toString());		
	}
	getSqrByIndex(index){
		return this.getSqr((index/9) |0, (index % 9) |0);
	}
	getSqr(row, col){
		return ((col / 3) |0) + ((row / 3) |0) * 3;
	}
}

const sudokuIdxSinglton = new SudokuIdx();

class Sudoku{
	constructor(str, readonly=false){
		let len = 9*9;
		this.vals = Array(len).fill(0);
		if (readonly){
			if (typeof str == "string" && str.length){
				let i = 0;
				for (const char of str){
					let v = parseInt(char, 10);
					this.vals[i++] = v;
					if (i >= len)
						break;
				}
			}
		} else {
			this.pvals = Array(len);
			for (let i=0; i<len; i++)
				this.pvals[i] = new Set([1,2,3,4,5,6,7,8,9]);
			if (typeof str == "string" && str.length){
				let i = 0;
				for (const char of str){
					let v = parseInt(char, 10);
					this.setValueByIndex(i++, v);
					if (i >= len)
						break;
				}
			}
		}
	}
	static getEmptyStr(){
		return new Sudoku().toString();
	}
	toString(cols=0){
		let result = "";
		let iCols = 0;
		let iTriple = 0;
		for (let i=0; i < this.vals.length; i++){
			result += this.vals[i].toString();
			if (cols){
				iCols++;
				iTriple++;
				if (iCols >= cols){
					result += "\n";
					iCols = 0;
					iTriple = 0;
				} 
				if (iTriple >= 3){
					result += ".";
					iTriple = 0;
				}
			}
		}
		return result.trim();
	}
	getVal(row, col) {	
		return this.vals[row*9 + col];	
	}
	getPValsByIndex(index){
		if (!this.pvals)
			return null;
		return this.pvals[index];
	}
	getPVals(row, col) {
		if (!this.pvals)
			return null;
		let index = row*9+col;
		return this.getPValsByIndex(index);
	}
	modifyDependentCells(index, v){
		let row = (index / 9)|0;
		let col = (index % 9)|0;
		let sqr = sudokuIdxSinglton.getSqr(row, col);
		for (const dCellIdx of sudokuIdxSinglton.idxBySqr[sqr])
			this.pvals[dCellIdx].delete(v);
		for (const dCellIdx of sudokuIdxSinglton.idxByRow[row])
			this.pvals[dCellIdx].delete(v);
		for (const dCellIdx of sudokuIdxSinglton.idxByCol[col])
			this.pvals[dCellIdx].delete(v);
	}
	modifyAllDependentCells(){
		let len = 9*9;
		for (let i=0; i<len; i++)
			this.pvals[i] = (this.vals[i] > 0) ? null : new Set([1,2,3,4,5,6,7,8,9]);
		for (let i=0; i<len; i++)
			if (this.vals[i] > 0)
				modifyDependentCells(i, this.vals[i]);
	}

	setValueByIndex(index, v){
		if(this.vals[index] == v)
			return;
		if (this.vals[index] > 0) {
			this.vals[index] = v;
			this.modifyAllDependentCells();
		} else {
			this.vals[index] = v;
			this.modifyDependentCells(index, v);
		}
	}
	setValue(row, col, v)
	{
		let index = row*9+col;
		this.setValueByIndex(index,v);
	}

}