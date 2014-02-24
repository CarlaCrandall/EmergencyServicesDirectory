var suggestArr = []; //array will hold suggested values for autocomplete

//////// Setup Defaults for all AJAX Calls ////////
$.ajaxSetup({
	type:'get',
	async:true,
	url:'proxy.php',
	dataType:'xml'
 });

 
$(document).ready(function(){
	//build select options
	getOrgs();
	getCities($('#state').val());
	
	$('#resultsTitle').css('display','none'); //hide "results" text
	
	//initialize autocomplete objects for text inputs	
	var inputs = $('#sForm input[type=text]');
	for(var i=0, l=inputs.length; i<l; i++){
		inputs.eq(i).autocomplete({
			lookup: suggestArr, //use array to suggest values
			minChars: 2,
			width: 215
		});
	}

	//if browser doesn't support pointerEvents, apply special class - fixes issues with styling the select arrow
	if(!('pointerEvents' in document.body.style)) { $('.selectWrapper').setAttribute('class','selectWrapper noPointerEvents'); }
});


//////// Submit form with enter key ////////
function enterSubmit(e){
	if (e.which == 13) {
		e.preventDefault();
        getResults();
    }
}
 
 
//////// Build Form Options ////////

//build select options for organization types
function getOrgs(){	
	$.ajax({
		data: {path: '/OrgTypes'},
		success: function(data){
			if($(data).find('type').length == 0){ //if no org types, alert user
				$('#orgTypeMsg').html("<span class='alert alert-warning'>There are no organization types available</span>");
			}
			else{ //if org types, build options...
				var x = '<option value="">--Search All Types--</option>';
				$('type',data).each(function(){
					x += '<option value="'+ $(this).text() +'">' + $(this).text() + '</option>';
				});
				$('#orgType').append(x);
			}
		}		
	});
}

//build select options for cities based on selected state
function getCities(state){
	$.ajax({
		data: {path: '/Cities?state='+state},
		success: function(data){
			if($(data).find('city').length == 0){ //if no cities, alert user
				$('#orgCitySearch').html('<span class="text-error">There are currently no cities in ' + state + '</span>');	
			}
			else{ //if cities, build options...
				var x = '<select id="city" name="town"><option value="">--Search All Cities--</option>';
				$('city',data).each(function(){
					x += '<option value="'+$(this).text()+'">'+$(this).text()+'</option>';
				});

				$('#orgCitySearch').html(x+'</select>');
			}
		}		
	});
}


//////// Get autocomplete suggestions based on form values ////////
function suggestValues(type){
	$.ajax({
		data: {path: '/Organizations?'+$('#sForm').serialize()},
		success: function(data){	
			if(suggestArr.length > 0){ //if array is holding data, empty it
				suggestArr.length = 0;
			}
			
			$(type,data).each(function(){
				if($.inArray($(this).text(), suggestArr) == -1){ //if value doesn't already exist in the array, add it (prevents duplicates)
					suggestArr.push($(this).text());
				}
			});
		}
	});
}



//////// Table Creation Functions ////////
function createRow(label, value){
	if(value != 'null' && value != ''){
		return '<tr><th>'+label+'</th><td>'+value+'</td></tr>'
	}
	else{
		return ''
	}
}
function createCell(value){
	if(value != 'null' && value != ''){
		return '<td>'+value+'</td>'
	}
	else{
		return '<td></td>'
	}
}



//////// Get & Display Search Results ////////
function getResults(){
	$.ajax({
		data: {path: '/Organizations?'+$('#sForm').serialize()},
		success: function(data){
			var dTable = $.fn.dataTable.fnTables(); //get all dataTables
			if(dTable.length > 0 && $('#searchResults tr:first').length){ //if results already exist...
				$('#searchResults').dataTable().fnDestroy(); //destroy dataTable object
				$('#searchResults').html(''); //wipe out all rows
				$('#numResults').html(''); //wipe out number of results
			}
			else{ //if results don't already exist...
				if($('#resultsTitle').css('display') == 'none'){ //if results title isn't visible, display it
					$('#resultsTitle').css('display','block');
				}
				if($('#noResults').length){ //if "noResults" list exists, remove it
					$('#noResults').remove();
				}
			}
			
			if($(data).find('row').length > 0){ //if results are found...
				if($(data).find('error').length != 0){ //if error, alert the user...
					alert('An error occurred while trying to get search results');
				}else{ 
					buildTable(data); //if no error, build table
					
					//initialize dataTable object - allows user to sort and filter the search results
					var oTable = $('#searchResults').dataTable({
						"sPaginationType": "full_numbers",
						"aoColumns": [
			            { sWidth: 'auto' },
			            { sWidth: 'auto' },
			            { sWidth: 'auto' },
			            { sWidth: '7%' },
			            { sWidth: 'auto' },
			            { sWidth: 'auto' }] 
					});
					
					if($('#orgType').val() != 'Physician'){ //if orgType is not physician...
						oTable.fnSort([[1, 'asc']]); //sort results by orgName, by default
					}
					else{ //if orgType is physician...
						oTable.fnSort([[0, 'asc']]); //sort results by physician name (last, first) by default
					}
					
					//display number of results
					var num = oTable.fnGetData().length;
					$('#numResults').html('(' + num + ' total found)');
				}
			}
			else{ //if no results...
				var noResults = '<div id="noResults" class="alert alert-danger"><strong style="padding-right: 10px;">No results for:</strong>';
				var formEle = $('#sForm input:text[value!=""]').add('#sForm select[value!=""]'); //get non-empty text boxes and selects
				for(var i=0, l=formEle.length; i<l; i++){ //loop through form elements
					if($(formEle).eq(i).val() != ''){ //if value was entered/selected, add it to the text
						noResults += $(formEle).eq(i).val();
						if(i < (l-1)){
							noResults += '<span style="padding: 0 10px;">&gt;</span>'; //don't want to add divider to the last item
						}
					}
				}
				$('#tableOutput').append(noResults + '</div>');
			}
		}
	});	
}

function buildTable(data){
	var orgType = $('#orgType').val();
	
	//build table header - first column depends on orgType
	var x = '<thead><tr><th>';
	if(orgType != 'Physician'){
		x += 'Type';
	}
	else{
		x += 'Name (Last, First)';
	}
	x += '</th><th>Organization</th><th>City</th><th>State</th><th>County</th><th>Zip</th></tr></thead><tbody>';
	
	//build table rows - first column depends on orgType
	$('row',data).each(function(){
		if(orgType != 'Physician'){ //if orgType is not Physician
			x += '<tr>'+createCell($(this).find('type').text());
		}
		else{ //if orgType is Physician
			x += '<tr>'+createCell($(this).find('lName').text()+', '+$(this).find('fName').text());
		}
		x += '<td><span class="orgLink" onclick="show('+$(this).find('OrganizationID').text()+', \''+escape($(this).find('Name').text())+'\')">'+$(this).find('Name').text()+'</span></td>'; //escape name in case of special characters
		x += createCell($(this).find('city').text());
		x += createCell($(this).find('State').text());
		x += createCell($(this).find('CountyName').text());
		x += createCell($(this).find('zip').text())+'</tr>';
	});	
	$('#searchResults').html(x+'</tbody>');
}


//////// Create  ////////

function show(orgId, orgName){
	$('#modal').modal();
	$('#modalTitle').html(unescape(orgName)); //name was escaped in case of special characters, so needs to be unescaped before displaying
	getTabs(orgId);	//build the tabs
}



//////// Build Tabs ////////

function getTabs(id){
	$.ajax({
		data: {path:'/Application/Tabs?orgId='+id},
		success: function(data){
			if($(data).find('error').length != 0){ //if error, alert the user...
				alert('An error occurred while trying to build tabs');
			}else{ //if no error, build tabs
				$('.tab-content').html(''); //wipe out any past tab content
				var count = 0;
				var list = '';
				$('Tab',data).each(function(){
					//create divs to hold tab content
					var tabDiv = '<div id="'+$(this).text()+'" ';
					
					//if first tab, add class="active"
					if(count == 0){ 
						tabDiv += 'class="tab-pane active"></div>';
						list += '<li class="active">';
						count++;
					}
					else{ //if not first tab, do not add class="active"
						tabDiv += 'class="tab-pane"></div>';
						list += '<li>';
					}
					$('.tab-content').append(tabDiv);
					list +='<a href="#'+$(this).text()+'" onclick="window[\'get'+ $(this).text() + '\']('+id+')" data-toggle="tab">'+$(this).text()+'</a></li>';
				});
				$('#tabs').html(list);

				getGeneral(id); //display the general info for this id
			}
		}		
	});
}

//Get data for general tab
function getGeneral(id){
	$.ajax({
		data: {path:'/'+id+'/General'},
		success: function(data){
			//build table
			var x = '<h4>General Information</h4><table width="100%" id="general">';
			x += createRow('Name', $(data).find('name').text());
			x += createRow('Description', $(data).find('description').text());
			x += createRow('Website', $(data).find('website').text());
			x += createRow('Email', $(data).find('email').text());
			x += createRow('Number of Members', $(data).find('nummembers').text());
			x += createRow('Number of Calls', $(data).find('numcalls').text());
			x += createRow('Service Area', $(data).find('serviceArea').text());
			$('#General').html(x+'</table>');
		}
	});
}

//build select options for locations tab
function getLocations(id){
	$.ajax({
		data: {path:'/'+id+'/Locations'},
		success: function(data){
			var x ='<h4>Location Information</h4>';
			if(parseInt($(data).find('count').text()) == 0){ //if no locations
				x += '<div class="alert alert-warning">No locations were found.</div>';
				$('#Locations').html(x);
			}
			else if(parseInt($(data).find('count').text()) > 1){ //if more than one location
				//build select options
				var firstLocationId;
				var count = 0;
				x += '<form class="modal-select">Please select a location: <select id="chooseLocation" onchange="getDataForLocation('+id+', this.value)" name="location">';
				$('location',data).each(function(){
					if(count == 0){
						firstLocationId = $(this).find('siteId').text(); //get ID for the first location
						count++;
					}
					x += '<option value="'+$(this).find('siteId').text()+'">'+capFirst($(this).find('type').text())+': '+$(this).find('address1').text()+'</option>'; //capFirst function capitalizes first letter of the string
				});
				$('#Locations').html(x+'</select></form>');
				getDataForLocation(id, firstLocationId); //load data for first location
				
			}
			else{ //if only one location
				$('#Locations').html(x);
				
				//get id for location
				var firstLocationId;
				$('location',data).each(function(){
					firstLocationId = $(this).find('siteId').text();
				});
				
				getDataForLocation(id, firstLocationId); //if only one location, automatically load data for that site
			}
		}
	});
}

//get data for locations tab
function getDataForLocation(id, siteID){
	$.ajax({
		data: {path:'/'+id+'/Locations'},
		success: function(data){
			$('location',data).each(function(){
				if(parseInt($(this).find('siteId').text()) == siteID){ //if location id matches site id
					//build table
					var x = '<table id="locationsData">';
					x += createRow('Type', capFirst($(this).find('type').text())); //capFirst function capitalizes the first letter of the string
					x += createRow('Address', $(this).find('address1').text());
					x += createRow('City', $(this).find('city').text());
					x += createRow('State', $(this).find('state').text());
					x += createRow('County', $(this).find('countyName').text());
					x += createRow('Zip', $(this).find('zip').text());
					x += createRow('Phone', $(this).find('phone').text());
					x += createRow('TTYPhone', $(this).find('ttyPhone').text());
					x += createRow('Fax', $(this).find('fax').text());
					x += createRow('Latitude', $(this).find('latitude').text());
					x += createRow('Longitude', $(this).find('longitude').text());
					
					if($('#locationsData').length){ //if table already exists, wipe it out
						$('#locationsData').remove() 
					}
					$('#Locations').append(x+'</table>');
					
					if($('#map').length){ //if map already exists on page, wipe it out
							$('#map').remove();
						}
					
					//get position
					var latPos = parseFloat($(this).find('latitude').text());
					var longPos = parseFloat($(this).find('longitude').text());

					//if latitude & longitude are numbers (not null)
					if(!isNaN(latPos) && !isNaN(longPos)){
						var map = '<div id="map"></div>'; //create map div
						
						$('#Locations').append(map);
						
						//initialize map object
						$("#map").goMap({ 
							maptype: 'ROADMAP',
							zoom: 15, 
							markers: [{  
								latitude: latPos, 
								longitude: longPos, 
								title: capFirst($(this).find('type').text()) + ' Location' 
							}]
						}); 
					}
				}
			});
		}
	});	
}

//get data for training tab
function getTraining(id){
	$.ajax({
		data: {path:'/'+id+'/Training'},
		success: function(data){
			var x = '<h4>Services / Training</h4>';
			if(parseInt($(data).find('count').text()) == 0){ //if no results
				x += '<div class="alert alert-warning">No services were found.</div>';
				$('#Training').html(x);
			}
			else if(parseInt($(data).find('count').text()) > 10){ //if more than 10 results, create dataTables object for pagination
				//build table
				x += '<table id="trainingTable" width="100%"><thead><tr><th>Type</th><th>Abbreviation</th></tr></thead><tbody>';
				$('training',data).each(function(){
					x+= '<tr>';
					x+= createCell($(this).find('type').text());
					x+= createCell($(this).find('abbreviation').text());
					x+= '</tr>';
				});
				$('#Training').html(x+'</tbody></table>');
				
				$('#trainingTable').dataTable({
					"sPaginationType": "full_numbers", 
					"bLengthChange": false, //hide drop down to select table length
				});
				
			}
			else{
				//build table
				x += '<table width="100%"><tr><th>Type</th><th>Abbreviation</th></tr>';
				$('training',data).each(function(){
					x+= '<tr>';
					x+= createCell($(this).find('type').text());
					x+= createCell($(this).find('abbreviation').text());
					x+= '</tr>';
				});
				$('#Training').html(x+'</table>');
			}
		}
	});
}

//get data for treatments tab
function getTreatment(id){
	$.ajax({
		data: {path:'/'+id+'/Treatments'},
		success: function(data){
			var x = '<h4>Treatments</h4>';
			if(parseInt($(data).find('count').text()) == 0){ //if no results
				x += '<div class="alert alert-warning">No treatments were found.</div>';
				$('#Treatment').html(x);
			}
			else if(parseInt($(data).find('count').text()) > 10){ //if more than 10 results, create dataTables object for pagination
				//build table
				x += '<table id="treatmentTable" width="100%"><thead><tr><th>Type</th><th>Abbreviation</th></tr></thead><tbody>';
				$('treatment',data).each(function(){
					x+= '<tr>';
					x+= createCell($(this).find('type').text());
					x+= createCell($(this).find('abbreviation').text());
					x+= '</tr>';
				});
				$('#Treatment').html(x+'</tbody></table>');
				
				$('#treatmentTable').dataTable({
					"sPaginationType": "full_numbers", 
					"bLengthChange": false, //hide drop down to select table length
				});
			}
			else{
				//build table
				x += '<table width="100%"><tr><th>Type</th><th>Abbreviation</th></tr>';
				$('treatment',data).each(function(){
					x+= '<tr>';
					x+= createCell($(this).find('type').text());
					x+= createCell($(this).find('abbreviation').text());
					x+= '</tr>';
				});
				$('#Treatment').html(x+'</table>');
			}
		}
	});	
}

//get data for facilities tab
function getFacilities(id){
$.ajax({
		data: {path:'/'+id+'/Facilities'},
		success: function(data){
			var x = '<h4>Facilities</h4>';
			if(parseInt($(data).find('count').text()) == 0){ //if no results
				x += '<div class="alert alert-warning">No facilities were found.</div>';
				$('#Facilities').html(x);
			}
			else if(parseInt($(data).find('count').text()) > 10){ //if more than 10 results, create dataTables object for pagination
				//build table
				x +='<table width="100%" id="facilitiesTable"><thead><tr><th>Name</th><th>Quantity</th><th>Description</th></tr></thead><tbody>';
				$('facility',data).each(function(){
					x+= '<tr>';
					x+= createCell($(this).find('type').text());
					x+= createCell($(this).find('quantity').text());
					x+= createCell($(this).find('description').text());
					x+= '</tr>';
				});
				$('#Facilities').html(x+'</tbody></table>');
				
				$('#facilitiesTable').dataTable({
					"sPaginationType": "full_numbers", 
					"bLengthChange": false, //hide drop down to select table length
				});
			}
			else{
				//build table
				x +='<table width="100%"><tr><th>Name</th><th>Quantity</th><th>Description</th></tr>';
				$('facility',data).each(function(){
					x+= '<tr>';
					x+= createCell($(this).find('type').text());
					x+= createCell($(this).find('quantity').text());
					x+= createCell($(this).find('description').text());
					x+= '</tr>';
				});
				$('#Facilities').html(x+'</table>');
			}
		}
	});	
}

//get data for equipment tab
function getEquipment(id){
	$.ajax({
		data: {path:'/'+id+'/Equipment'},
		success: function(data){
			var x = '<h4>Equipment</h4>';
			if(parseInt($(data).find('count').text()) == 0){ //if no results
				x += '<div class="alert alert-warning">No equipment was found.</div>';
				$('#Equipment').html(x);
			}
			else if(parseInt($(data).find('count').text()) > 10){ //if more than 10 results, create dataTables object for pagination
				//build table
				x +='<table width="100%" id="equipmentTable"><thead><tr><th>Type</th><th>Quantity</th><th>Description</th></tr></thead><tbody>';
				$('equipment',data).each(function(){
					x+= '<tr>';
					x+= createCell($(this).find('type').text());
					x+= createCell($(this).find('quantity').text());
					x+= createCell($(this).find('description').text());
					x+= '</tr>';
				});
				$('#Equipment').html(x+'</tbody></table>');
				
				$('#equipmentTable').dataTable({
					"sPaginationType": "full_numbers", 
					"bLengthChange": false, //hide drop down to select table length
				});
			}
			else{
				//build table
				x +='<table width="100%"><tr><th>Type</th><th>Quantity</th><th>Description</th></tr>';
				$('equipment',data).each(function(){
					x+= '<tr>';
					x+= createCell($(this).find('type').text());
					x+= createCell($(this).find('quantity').text());
					x+= createCell($(this).find('description').text());
					x+= '</tr>';
				});
				$('#Equipment').html(x+'</table>');
			}
		}
	});
}

//get data for physicians tab
function getPhysicians(id){
	$.ajax({
		data: {path:'/'+id+'/Physicians'},
		success: function(data){
			var x ='<h4>Physicians With Admitting Priviledges</h4>';
			if(parseInt($(data).find('count').text()) == 0){ //if no results
				x += '<div class="alert alert-warning">No physicians were found.</div>';
				$('#Physicians').html(x);
			}
			else if(parseInt($(data).find('count').text()) > 10){ //if more than 10 results, create dataTables object for pagination
				//build table
				x += '<table width="100%" id="physicianTable"><thead><tr><th>Name</th><th>License</th><th>Phone Number</th></tr></thead><tbody>';
				$('physician',data).each(function(){
					x+= '<tr>';
					x+= createCell($(this).find('fName').text()+' '+$(this).find('mName').text()+' '+$(this).find('lName').text());
					x+= createCell($(this).find('license').text());
					x+= createCell($(this).find('phone').text());
					x+= '</tr>';
				});
				$('#Physicians').html(x+'</tbody></table>');
				
				$('#physicianTable').dataTable({
					"sPaginationType": "full_numbers", 
					"iDisplayLength": 10, //change default number of records
					"bLengthChange": false //hide drop down to select table length
				});
			}
			else{
				//build table
				x += '<table width="100%"><tr><th>Name</th><th>License</th><th>Phone Number</th></tr>';
				$('physician',data).each(function(){
					x+= '<tr>';
					x+= createCell($(this).find('fName').text()+' '+$(this).find('mName').text()+' '+$(this).find('lName').text());
					x+= createCell($(this).find('license').text());
					x+= createCell($(this).find('phone').text());
					x+= '</tr>';
				});
				$('#Physicians').html(x+'</table>');
			}
		}
	});
}

//build select options for people tab
function getPeople(id){
	$.ajax({
		data: {path:'/'+id+'/People'},
		success: function(data){
			var x ='<h4>People</h4>';
			if(parseInt($(data).find('siteCount').text()) == 0){ //if no sites
				x += '<div class="alert alert-warning">No sites were found.</div>';
				$('#People').html(x);
			}
			else if(parseInt($(data).find('siteCount').text()) > 1){ //if more than one site
				//add up all people from all sites
				var howMany = 0;
				$('site',data).each(function(){	
					howMany += parseInt($(this).find('personCount').text());
				});
				if(howMany == 0){ //if no people, display alert
					x += '<div class="alert alert-warning">No people were found.</div>';
					$('#People').html(x);
				}
				else{ //if people
					//build select options
					x += '<form class="modal-select">Please select a site: <select id="chooseSite" onchange="getPeopleForSite('+id+', this.value)" name="site">';
					x += '<option selected="selected" value="">--Show All Sites--</option>';
					$('site',data).each(function(){
						x += '<option value="'+$(this).attr('siteId')+'">'+capFirst($(this).attr('siteType'))+': '+$(this).attr('address')+'</option>'; //capFirst function capitalizes first letter of the string
					});
					$('#People').html(x+'</select></form>');
					getPeopleForSite(id, ''); //load data for all sites
				}
			}
			else{ //if only one site...
				$('#People').html(x);
				getPeopleForSite(id, 1); //if only one site, automatically load data for that site
			}
		}
	});
}

//get data for people tab
function getPeopleForSite(id, siteID){
	$.ajax({
		data: {path:'/'+id+'/People'},
		success: function(data){
			//if results already exist, remove them
			if($('#peopleList').length){
				$('#peopleList').remove()
			}
			if($('#peopleTable').length){
				$('#peopleTable').dataTable().fnDestroy();
				$('#peopleTable').remove()		
			}
			
			var x = '';			
			if(siteID == ''){ //if all sites were chosen
				var howMany = 0;
				$('site',data).each(function(){	
					howMany += parseInt($(this).find('personCount').text());
				});
				
				if(howMany > 10){ //if more than 10 results, create dataTables object for pagination
					x += '<table id="peopleTable" width="100%">';
					x += '<thead><tr><th>Name</th><th>Role</th><th>Site</th></tr></thead><tbody>';
					$('site',data).each(function(){					
						var siteCell = createCell(capFirst($(this).attr('siteType'))+': '+$(this).attr('address')); //capFirst function capitalizes the first letter of the string
						if(parseInt($(this).find('personCount').text()) > 0){
							$('person',$(this)).each(function(){
								x += '<tr>'+createCell($(this).find('lName').text());
								x += createCell($(this).find('role').text()); 
								x += siteCell+'</tr>';
							});
						}
					});
					$('#People').append(x+'</tbody></table>');
					
					$('#peopleTable').dataTable({
						"sPaginationType": "full_numbers", 
						"bLengthChange": false, //hide drop down to select table length
					});
				}
				else{ //if less than 10 results, create normal table
					x += '<table id="peopleList" width="100%">';
					x += '<tr><th>Name</th><th>Role</th><th>Site</th></tr>';
					$('site',data).each(function(){					
						var siteCell = createCell(capFirst($(this).attr('siteType'))+': '+$(this).attr('address')); //capFirst function capitalizes the first letter of the string
						if(parseInt($(this).find('personCount').text()) > 0){
							$('person',$(this)).each(function(){
								x += '<tr>'+createCell($(this).find('lName').text());
								x += createCell($(this).find('role').text()); 
								x += siteCell+'</tr>';
							});
						}
					});	
					$('#People').append(x+'</table>');
				}			
			}
			else{ //if specific site was chosen
				$('site[siteId='+siteID+']',data).each(function(){
					if(parseInt($(this).find('personCount').text()) == 0){ //if no people, display alert
						x += '<div id="peopleList" class="alert alert-warning">No people were found.</div>';
						$('#People').append(x);
					}
					else if(parseInt($(this).find('personCount').text()) > 10){ //if more than 10 results, create dataTables object for pagination
						x += '<table id="peopleTable" width="100%"><thead><tr><th>Name</th><th>Role</th></tr></thead><tbody>';
						$('person',$(this)).each(function(){
							x += '<tr>'+createCell($(this).find('lName').text());
							x += createCell($(this).find('role').text())+'</tr>'; 
						});
						$('#People').append(x+'</tbody></table>');
						
						$('#peopleTable').dataTable({
							"sPaginationType": "full_numbers", 
							"bLengthChange": false, //hide drop down to select table length
						});
					}
					else{ //if less than 10 results, build normal table
						x += '<table id="peopleList" width="100%"><tr><th>Name</th><th>Role</th></tr>';
						$('person',$(this)).each(function(){
							x += '<tr>'+createCell($(this).find('lName').text());
							x += createCell($(this).find('role').text())+'</tr>'; 
						});
						$('#People').append(x+'</table>');
					}
				});
			}
		}
	});
}

//capitalize first letter of string
function capFirst(string){
	return string.charAt(0).toUpperCase() + string.slice(1);
}


//toggle visibility of advanced search options
function toggleOptions(){
	
	if($("#advancedOptions").css("display") == "none"){
		$("#advancedOptions").show();
		$("#showAdvanced").html("Hide Advanced Options")
	}
	else{
		$("#advancedOptions").hide();
		$("#showAdvanced").html("Show Advanced Options")
	}
}
