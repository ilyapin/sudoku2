<?php
try {
	@ob_start();
	define('DB_FILE', __DIR__."/db/sudoku.db");
	define('BUSY_TIMEOUT', 15000);
	$DB = null;
	include_once(__DIR__."/onlineutils.php");

	$method = GetVar('method', false);
	if (!in_array($method, ['save','fetch','delete']))
		do_jsonResult(array("result"=>false, "error"=>"!\$method"));

	if ($method == 'save')
		Save_impl();
	else if ($method == 'fetch')
		Fetch_impl();
	else if ($method == 'delete')
		Delete_impl();
	else
		do_jsonResult(array("result"=>false, "error"=>"unknown method"));

} catch (Throwable $e) {
	do_jsonResult(array("result"=>false, "error"=>$e->getMessage()));
}

function GetFieldValues($fieldNames){
	$result = [];
	foreach ($fieldNames as $name){
		$value = GetVar($name, null);
		if ($value)
			$result[$name] = $value;
	}
	return $result;
}

function Save_impl(){
	$fields = GetFieldValues(['name', 'value', 'history']);
	$fields['time'] = time();

	$id = GetVar('id', null);
	if (!$id){
		$id = do_insert('sudoku', $fields);
		do_jsonResult(array("result"=>true, "id"=>$id));
	} else {
		do_update('sudoku', $fields, ['id'=>$id]);
		do_jsonResult(array("result"=>true, "id"=>$id));
	}
}

function Fetch_impl(){
	$result = select_rows("SELECT * FROM \"sudoku\" ORDER BY \"time\" desc");
	do_jsonResult(array("result"=>true, "rows"=>$result));
}

function Delete_impl(){
	$id = GetVar('id', null);
	if (!$id)
		throw new Exception('!id');
	$sql = "DELETE FROM \"sudoku\" WHERE id=".intval($id);
	exec_sql($sql);
	do_jsonResult(array("result"=>true));
}