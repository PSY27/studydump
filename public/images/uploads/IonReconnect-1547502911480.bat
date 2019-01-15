@if (@CodeSection == @Batch) @then

@echo off

set UXNZRT = 170911030
set PSWRXT = LR0WDQJG

:pickConn
	set Network=
	timeout /t 5 /nobreak > NUL
	for /f "delims=: tokens=2" %%n in ('netsh wlan show interface name="Wi-Fi" ^| findstr "ION"') do set Network=%%n & set Network=%Network:~1% & goto :checkConn
	
:checkConn
	if not defined Network (
		echo You aren't connected
		echo Run after connecting to a network
		timeout /t 1 /nobreak >NUL
		goto :pickConn
	) else (
		goto :checkPing
	)

:checkPing
	ping -n 1 www.google.com ^| findstr "TTL"
	if errorlevel 1 (
		set SendKeys=CScript //nologo //E:JScript "%~F0"
		START chrome.exe "https://wifilogin.myion.in/?page=login"
				
		timeout /t 1 /nobreak >NUL
		%SendKeys% "+{TAB}{TAB}%UXNZRT%{TAB}"
		%SendKeys% "%PSWRXT%{ENTER}"
	)
	timeout /t 10 /nobreak >NUL
	
	goto :pickConn

@echo on

@end
// JScript section

var WshShell = WScript.CreateObject("WScript.Shell");
WshShell.SendKeys(WScript.Arguments(0))