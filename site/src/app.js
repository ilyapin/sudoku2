'use strict';

class App extends React.Component {
	constructor(props) {
		super(props);
		this.state = this.newState();
	}
	newState(){
		return	 {
			sudoku: new Sudoku(),
			name: "Default",
			move: 0,
			last: -1,
			id: null,
			modified: false,
		}
	}
	confirmIfModified(){
		return !this.state.modified || confirm("This will reset your progress. Continue?");
	}
	handleCellClick = (index, val) => {
		let s = this.state.sudoku;
		s.setValueByIndex(index, val);
		let move = this.state.move + 1;
		this.setState({
			sudoku : s,
			move : move,
			lastindex : index,
			modified : true
		});
	};
	handleCellUndoClick = (index) => {
		let s = this.state.sudoku;
		s.setValueByIndex(index, 0);
		let move = this.state.move - 1;
		this.setState({
			sudoku : s,
			move : move,
			lastindex : -1,
			modified : true
		});
	}
	handleNameChange = (name) =>{
		this.setState({
			name:name,
			modified : true
		});
	}
	handleSave = (saveAsData) => {
		//?? todo 'history'
		let params = {
			"name": this.state.name,
			"value": this.state.sudoku.toString()
		};
		if (saveAsData){
			params.name = saveAsData.name
		}
		if (this.state.id)
			params.id = this.state.id;
		Utils.fetchSudokusrv('save', params, (data)=>{
			this.setState({
				id: data.id,
				modified: false
			});
		});
	}
	handleListClick = (listitem) => {
		if (this.confirmIfModified())
		{
			let state = Object.assign(this.newState(), {
				id: listitem.id,
				sudoku: new Sudoku(listitem.value),
				name: listitem.name,
			});
			this.setState(state);
		}
	}
	handleNew = () => {
		if (this.confirmIfModified())
			this.setState(this.newState());
	}
	render() {
		return (
			<div className="container">
				<div className="row">
					<div className="col-6">
						<strong>{(this.state.id)?"ID:"+this.state.id+'|':''}{this.state.name} - Move #{this.state.move}</strong>&nbsp;&bull;&nbsp;
						<MenuButtons name={this.state.name} 
							saveEnabled={Boolean(this.state.modified)} 
							canSave = {Boolean(this.state.id)}
							onSave={this.handleSave}
							onNew={this.handleNew}/>
					</div>
				</div>
				<div className="row">
					<div className="col-8">
						<Board sudoku={this.state.sudoku} readonly={false} lastindex={this.state.lastindex} onCellClick={this.handleCellClick} onCellUndoClick={this.handleCellUndoClick} />
						<div>
							Log
						</div>
					</div>
					<div className="col-4 d-flex justify-content-center">
						<SudokuList onItemClick={this.handleListClick}/>
					</div>
				</div>
			</div>
		);
	}
}

class Board extends React.Component {
	renderCell(index, value, pvals, isLast){
		return (
			<Cell key={index} index={index} readonly={this.props.readonly} value={value} pvals={pvals} isLast={isLast} onCellClick={this.props.onCellClick} onCellUndoClick={this.props.onCellUndoClick}></Cell>
		);
	}
	render(){
		let rows = [];
		for (let i=0; i<9; i++){
			let row = [];
			for (let j=0; j<9; j++){
				let index = i*9 + j;
				row.push(this.renderCell(index, 
										this.props.sudoku.getVal(i, j), 
										this.props.sudoku.getPVals(i, j), 
										this.props.lastindex==index));
			}
			rows.push(row);
		}
		let className = (this.props.readonly)? className="readonly" : className="board";
		return (
			<table className={className}><tbody>{rows.map((row, index)=>(<tr key={index}>{row}</tr>))}</tbody></table>
		);
	}
}

class Cell extends React.Component{
	handleCellClick(e, value){
		e.preventDefault();
		this.props.onCellClick(this.props.index, value);
	};
	handleCellUndoClick(e){
		e.preventDefault();
		this.props.onCellUndoClick(this.props.index);
	};

	render(){
		let content = "";
		if (this.props.value){
			let digit = <strong className={this.props.isLast?"lastvalue":"value"}>{this.props.value}</strong>;
			if (this.props.readonly)
				content = digit;
			else
				content = <a href={"board/undo/"+this.props.index} onClick={(e)=>this.handleCellUndoClick(e, v)}>{digit}</a>;
		}
		else if (this.props.pvals && this.props.pvals.size){
			content = [];
			for (const v of this.props.pvals) {
				content.push(<a href={"board/"+this.props.index+"/"+v} key={v} onClick={(e)=>this.handleCellClick(e, v)}>{v}</a>)
			}
		}
		return Utils.isGreySqr(this.props.index) ?	
				<td className="bgclg">{content}</td> : 
				<td>{content}</td>;
	}
}

class MenuButtons extends React.Component{
	constructor(props) {
		super(props);
		this.state = { showSaveAsDialog : false }
	}
	handleSaveAsDialogHidden = () => {
		this.setState({	showSaveAsDialog : false });
	}
	handleSaveAsClick = () => {
		this.setState({	showSaveAsDialog : true	});
	}
	handleSaveClick = () => {
		if (this.props.canSave)
			this.props.onSave();		
		else
			this.handleSaveAsClick();
	}
	render(){
		let saveAsDialog = null;
		if (this.state.showSaveAsDialog)
			saveAsDialog = <BootstrapSaveAsDialog title="Save as" name={this.state.name} 
								onSave={this.props.onSave} onHidden={this.handleSaveAsDialogHidden}/> 

		return(
			<React.Fragment>
				<button className="btn btn-primary" onClick={this.props.onNew}>New</button>&nbsp;
				<button className="btn btn-primary" onClick={this.handleSaveClick} disabled={!Boolean(this.props.saveEnabled)}>Save</button>&nbsp;
				<button className="btn btn-primary" onClick={this.handleSaveAsClick}>Save as</button>
				{saveAsDialog}
			</React.Fragment>
		);
	}
}

class SudokuList extends React.Component{
	constructor(props){
		super(props);
		this.state={
			error: null,
			list: null
		}
	}
    componentDidMount() {
		Utils.fetchSudokusrv("fetch", null, (data) => this.setState({list: data.rows}));
    }
	handleDelete = (id) => {
		if (confirm("Delete permanently?")){
			Utils.fetchSudokusrv('delete', {id:id}, (data) => {
				let newList = this.state.list.filter(item => item.id != id)
				this.setState({	list: newList });
			});
		}
	}
	render(){
		if (!this.state.list) {
			if (this.state.error) {
				return(<div>Loading Error: { this.state.error }</div>);
			} else {
				return(<div>Loading...</div>);
			}
		} else if (this.state.list) {
			return(
				<div>{this.state.list.map(
					(item)=><SudokuListItem key={item.id} item={item} onItemClick={this.props.onItemClick} onDeleteClick={this.handleDelete}/>)
				}</div>
			);
		}
	}
}

class SudokuListItem extends React.Component{
	handleClick = (e) => {
		e.preventDefault();
		this.props.onItemClick(this.props.item);
	};
	handleDelete = (e) => {
		e.preventDefault();
		this.props.onDeleteClick(this.props.item.id);
	}
	render(){
		return (
			<div className="listitem">
				<Board readonly={true} sudoku={new Sudoku(this.props.item.value, true)}></Board>
				<a href={"/load/"+this.props.item.id} onClick={this.handleClick}>{this.props.item.name}</a>&nbsp;&bull;&nbsp;
				<a href={"/delete/"+this.props.item.id} onClick={this.handleDelete}>Delete</a>
			</div>
		);
	}
}

class BootstrapSaveAsDialog extends React.Component{
	constructor(props){
		super(props);
		this.state = {
			name: props.name,
			bSaveHistory : false
		}
		this.saveAsDialog = React.createRef();
	}
	handleChange(e){
		this.setState({	name:e.target.value	});
	}
	handleHistoryChange(e){
		this.setState({	bSaveHistory:e.target.checked });
	}
	handleSaveClick(){
		jQuery(this.saveAsDialog.current).modal("hide");	
		this.props.onSave(this.state);	
	}
	handleCloseClick(){
		jQuery(this.saveAsDialog.current).modal("hide");	
	}
	componentDidMount() {
		jQuery(this.saveAsDialog.current).modal("show");
		jQuery(this.saveAsDialog.current).on('hidden.bs.modal', (e) =>{ this.props.onHidden(); });
	}
	componentWillUnmount() {
		jQuery(this.saveAsDialog.current).modal("dispose");
	}
	
	render(){
		return(		
<div className="modal" tabIndex="-1" role="dialog"	ref={this.saveAsDialog}>
	<div className="modal-dialog" role="document">
		<div className="modal-content">
			<div className="modal-header">
				<h5 className="modal-title">{this.props.title}</h5>
				<button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={(e)=>this.handleCloseClick(e)}>
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div className="modal-body">
				<div className="form-row">
					<label className="col-4 col-form-label" htmlFor="sasDlg_Name">Name:</label>
					<input id="sasDlg_Name" className="form-control col-8" type="text" value={this.state.name} onChange={(e)=>this.handleChange(e)}/>
				</div>
				<div className="form-row">
					<div className="form-check">
						<label className="form-check-label col-form-label" htmlFor="sasDlg_SaveHistory">Save history</label>
						<input className="form-check-input" type="checkbox" checked={this.state.bSaveHistory} id="sasDlg_SaveHistory" onChange={(e)=>this.handleHistoryChange(e)}/>
					</div>
				</div>
			</div>
			<div className="modal-footer">
				<button type="button" className="btn btn-primary" onClick={(e)=>this.handleSaveClick(e)}>Save</button>
				<button type="button" className="btn btn-secondary" data-dismiss="modal" onClick={(e)=>this.handleCloseClick(e)}>Cancel</button>
			</div>
		</div>
	</div>
</div>);
	}
}
const domContainer = document.getElementById('app_container');
ReactDOM.render(<App/>, domContainer);
