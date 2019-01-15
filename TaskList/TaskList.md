#	Study Dump API

This is basic log of functionality and approach on improvements

    Project code : 1000
    Project Name : Adhyayan_Sandaas
    Curr version : 0.4.0

###	Changelog:
-	Use get requests for listUploads
-	Added Pagination
-	Added concrete http return codes
-	Implemented timestamp functionality
-   Added lastModified function
-	Fixed minor bugs
-	Added deletion route for debugging
-	Added JWT authentication mechanism for basic perma-auth
-	File download route added
-	Fixed call/download count
-	Added token expiry of 1 year
-	Added Like Functionality
-	Upserted the timestamp collection
-	Bulk uploads route added
-	Duplication handled through cheap hack

###	To-Do:
-	Thumbnail - add downloadURL parameter to return json of list uploads
-	Duplication/spam - OCR???
-	isAvailable functionality - server side script
-	Notifications
-	favicon
-	*faculty account

### For Server Upload
-	Serever-side isAvailable routine check
-	Convert debug route to server side script
-	Server-side purge scripts for action-logging
-	Make server side scripts for management
-	Store public n private keys in venv vars (ssh-keygen)
-	Blacklist IPs trying multiple times to create jwt