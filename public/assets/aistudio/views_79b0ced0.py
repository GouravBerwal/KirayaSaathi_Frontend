from django.shortcuts import render

# Create your views here.

# Dashboard & General

def dashboard(request):
    return render(request, 'dashboard.html')

def notifications(request):
    return render(request, 'notifications.html')

def settings(request):
    return render(request, 'settings.html')

# Properties

def property_list(request):
    return render(request, 'properties/property_list.html')

def add_property(request):
    return render(request, 'properties/add_property.html')

def edit_property(request):
    return render(request, 'properties/edit_property.html')

def property_detail(request):
    return render(request, 'properties/property_detail.html')

def property_filter(request):
    return render(request, 'properties/property_filter.html')

# Rooms

def rooms(request):
    return render(request, 'rooms/rooms.html')

def add_room(request):
    return render(request, 'rooms/add_room.html')

# Tenants

def tenants(request):
    return render(request, 'tenants/tenants.html')

def tenant_profile(request):
    return render(request, 'tenants/tenant_profile.html')

def tenant_detail(request):
    return render(request, 'tenants/tenant_detail.html')

# Rent & Billing

def rent_management(request):
    return render(request, 'rent/rent_management.html')

def electricity_bill_form(request):
    return render(request, 'electricity/electricity_bill_form.html')

def invoice_list(request):
    return render(request, 'invoices/invoice_list.html')

def reports(request):
    return render(request, 'reports/reports.html')

def electricity_bill_list(request):
    return render(request, 'electricity/electricity_bill_list.html')
