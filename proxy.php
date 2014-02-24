<?php
error_reporting(0);
define ('HOSTNAME', 'http://simon.ist.rit.edu:8080/Services/resources/ESD');
if($_POST['path']){
	$hold=explode('?',$_POST['path']);
	$path=$hold[0];
	$post=$hold[1]."&ip=".$_SERVER['REMOTE_ADDR'];
	$url= HOSTNAME.$path;
	$session = curl_init($url);
	curl_setopt($session, CURLOPT_HEADER, false);
	curl_setopt($session, CURLOPT_RETURNTRANSFER, true);
	curl_setopt($session,CURLOPT_POST,1);
	curl_setopt($session,CURLOPT_POSTFIELDS,$post);
}else{
	$url=HOSTNAME.$_GET['path'];
	$session = curl_init($url);
	curl_setopt($session, CURLOPT_HEADER, false);
	curl_setopt($session, CURLOPT_RETURNTRANSFER, true);
}
$xml = curl_exec($session);
header("Content-Type: text/xml");
echo $xml;
curl_close($session);
?>
