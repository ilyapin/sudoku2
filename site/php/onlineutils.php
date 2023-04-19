<?php
function GetVar($name, $default)
{
	if (array_key_exists($name,$_GET)) {
		return $_GET[$name];
	} else if (array_key_exists($name,$_POST)) {
		return $_POST[$name];
	} else
		return $default;
}


function RandomStr_impl($chars, $len){
	$result = "";

	if (function_exists('openssl_random_pseudo_bytes'))
	{
		$chars_len = strlen($chars);
		$r = openssl_random_pseudo_bytes($len*2);
		for ($i = 0; $i < $len; $i++) {
			$v = ord($r[2*$i]) * 256 + ord($r[2*$i+1]);
			$result .= $chars[$v % $chars_len];
		}
	} else {
		$chars_len = strlen($chars)-1;
		for ($i=0; $i<$len; $i++)
			$result .= $chars[mt_rand(0,$chars_len)];
	}
	return $result;
}

function RandomStr($len=32){
	$chars = "abcdefghijklmnopqrstuvwxyz1234567890";
	return RandomStr_impl($chars, $len);
}

function RandomStr62($len=32){
	$chars = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	return RandomStr_impl($chars, $len);
}

function do_jsonResult($result) {
	while (ob_get_level() > 0)
		ob_end_clean();
	header("Content-type : application/json");
	die(json_encode($result));
}

function GetDB() : SQLite3
{
	global $DB;
	if (!$DB) {
		$DB = new SQLite3(DB_FILE);
		$DB->enableExceptions(true);
		$DB->busyTimeout(BUSY_TIMEOUT);
		$DB->exec('PRAGMA busy_timeout = '.BUSY_TIMEOUT.';');
	}
	return $DB;
}

function select_value($sql, $params=null) {
	$row = select_row($sql, $params);
	if (is_array($row))
		return $row[0];
	else
		return false;

}

function bind_params($stmt, $params = null){
	if (is_array($params)) {
		foreach ($params as $pname=>$pval) 
			$stmt->bindValue($pname, $pval);
	}
}

function select_row($sql, $params=null) {
	$stmt = GetDB()->prepare($sql);
	try{
		bind_params($stmt, $params);
		return $stmt->execute()->fetchArray(SQLITE3_ASSOC);
	} finally{
		$stmt->close();
		unset($stmt);
	}
}

function select_rows($sql, $params=null) {
	$stmt = GetDB()->prepare($sql);
	try{
		bind_params($stmt, $params);
		$result = [];
		$qryResult = $stmt->execute();
		while ($row = $qryResult->fetchArray(SQLITE3_ASSOC))
			array_push($result, $row);
		return $result;
	} finally{
		$stmt->close();
		unset($stmt);
	}
}

function exec_sql($sql){
	return exec_sql_params($sql, null);
}

function exec_sql_params($sql, $params){
	$stmt = GetDB()->prepare($sql);
	try{
		bind_params($stmt, $params);
		$stmt->execute();
	} finally{
		$stmt->close();
		unset($stmt);
	}
}

function do_update($table, $fieldValues, $where){
	if (count($fieldValues) <=0)
		throw new Exception("!count(\$fieldValues)");
	$sql = "UPDATE \"$table\" SET ";
	$comma = "";
	$params = [];
	foreach($fieldValues as $key=>$value){
		$sql .= $comma."\"$key\"=:$key";
		$comma =', ';
		$params[':'.$key] = $value;
	}
	if (count($where) <=0)
		throw new Exception("!count(\$where)");
	$sql .= " WHERE ";
	$and = "";
	foreach($where as $key=>$value){
		$sql .= $and."(\"$key\"=:$key)";
		$and =' AND ';
		$params[':'.$key] = $value;
	}
	exec_sql_params($sql, $params);
}

function do_insert($table, $fieldValues){
	if (count($fieldValues) <=0)
		throw new Exception("!count(\$fieldValues)");
	$sql = "INSERT INTO \"$table\"(";
	$comma = "";
	$params = [];
	foreach($fieldValues as $key=>$value){
		$sql .= $comma."\"$key\"";
		$comma =', ';
		$params[':'.$key] = $value;
	}
	$comma = "";
	$sql .=") VALUES (";
	foreach($params as $key=>$value){
		$sql .= $comma.$key;
		$comma =', ';
	}
	$sql .= ")";
	exec_sql_params($sql, $params);
	return get_sql_insert_id();
}

function get_sql_insert_id(){
	return GetDB()->lastInsertRowID();
}