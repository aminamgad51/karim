// Content script for ETA Invoice Exporter with complete column mapping
class ETAContentScript {
  constructor() {
    this.invoiceData = [];
    this.allPagesData = [];
    this.totalCount = 0;
    this.currentPage = 1;
    this.totalPages = 1;
    this.isProcessingAllPages = false;
    this.progressCallback = null;
    this.init();
  }
  
  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.scanForInvoices());
    } else {
      this.scanForInvoices();
    }
    
    this.setupMutationObserver();
  }
  
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.classList?.contains('ms-DetailsRow') || 
                  node.querySelector?.('.ms-DetailsRow') ||
                  node.classList?.contains('ms-List-cell') ||
                  node.classList?.contains('eta-pageNumber')) {
                shouldRescan = true;
              }
            }
          });
        }
      });
      
      if (shouldRescan && !this.isProcessingAllPages) {
        clearTimeout(this.rescanTimeout);
        this.rescanTimeout = setTimeout(() => this.scanForInvoices(), 1000);
      }
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  scanForInvoices() {
    try {
      this.invoiceData = [];
      
      // Extract pagination info
      this.extractPaginationInfo();
      
      // Find invoice rows using the correct selectors
      const rows = document.querySelectorAll('.ms-DetailsRow[role="row"]');
      console.log(`ETA Exporter: Found ${rows.length} invoice rows on page ${this.currentPage}`);
      
      rows.forEach((row, index) => {
        const invoiceData = this.extractDataFromRow(row, index + 1);
        if (this.isValidInvoiceData(invoiceData)) {
          this.invoiceData.push(invoiceData);
        }
      });
      
      console.log(`ETA Exporter: Extracted ${this.invoiceData.length} valid invoices from page ${this.currentPage}`);
      
    } catch (error) {
      console.error('ETA Exporter: Error scanning for invoices:', error);
    }
  }
  
  extractPaginationInfo() {
    try {
      // Extract total count from pagination
      const totalLabel = document.querySelector('.eta-pagination-totalrecordCount-label');
      if (totalLabel) {
        const match = totalLabel.textContent.match(/(\d+)/);
        if (match) {
          this.totalCount = parseInt(match[1]);
        }
      }
      
      // Alternative selectors for total count
      if (!this.totalCount) {
        const paginationText = document.querySelector('[class*="pagination"]');
        if (paginationText) {
          const match = paginationText.textContent.match(/(\d+)\s*(?:من|of|total)/i);
          if (match) {
            this.totalCount = parseInt(match[1]);
          }
        }
      }
      
      // Extract current page
      const currentPageBtn = document.querySelector('.eta-pageNumber.is-checked, .ms-Button--primary[aria-pressed="true"]');
      if (currentPageBtn) {
        this.currentPage = parseInt(currentPageBtn.textContent) || 1;
      }
      
      // Calculate total pages (assuming 10 items per page by default)
      const itemsPerPage = this.invoiceData.length || 10;
      this.totalPages = Math.ceil(this.totalCount / itemsPerPage);
      
      console.log(`ETA Exporter: Page ${this.currentPage} of ${this.totalPages}, Total: ${this.totalCount} invoices`);
      
    } catch (error) {
      console.warn('ETA Exporter: Error extracting pagination info:', error);
    }
  }
  
  extractDataFromRow(row, index) {
    // Complete invoice data structure matching the images exactly
    const invoice = {
      index: index,
      // Column A: مسلسل (Serial Number)
      serialNumber: index,
      
      // Column B: تفاصيل (Details - View button)
      detailsButton: 'عرض',
      
      // Column C: نوع المستند (Document Type)
      documentType: '',
      
      // Column D: نسخة المستند (Document Version)
      documentVersion: '',
      
      // Column E: الحالة (Status)
      status: '',
      
      // Column F: تاريخ الإصدار (Issue Date)
      issueDate: '',
      
      // Column G: تاريخ التقديم (Submission Date)
      submissionDate: '',
      
      // Column H: عملة الفاتورة (Invoice Currency)
      invoiceCurrency: '',
      
      // Column I: قيمة الفاتورة (Invoice Value)
      invoiceValue: '',
      
      // Column J: ضريبة القيمة المضافة (VAT)
      vatAmount: '',
      
      // Column K: الخصم تحت حساب الضريبة (Tax Discount)
      taxDiscount: '',
      
      // Column L: إجمالي الفاتورة (Total Invoice)
      totalInvoice: '',
      
      // Column M: الرقم الداخلي (Internal Number)
      internalNumber: '',
      
      // Column N: الرقم الإلكتروني (Electronic Number)
      electronicNumber: '',
      
      // Column O: الرقم الضريبي للبائع (Seller Tax Number)
      sellerTaxNumber: '',
      
      // Column P: اسم البائع (Seller Name)
      sellerName: '',
      
      // Column Q: عنوان البائع (Seller Address)
      sellerAddress: '',
      
      // Column R: الرقم الضريبي للمشتري (Buyer Tax Number)
      buyerTaxNumber: '',
      
      // Column S: اسم المشتري (Buyer Name)
      buyerName: '',
      
      // Column T: عنوان المشتري (Buyer Address)
      buyerAddress: '',
      
      // Column U: مرجع طلب الشراء (Purchase Order Reference)
      purchaseOrderRef: '',
      
      // Column V: وصف طلب الشراء (Purchase Order Description)
      purchaseOrderDesc: '',
      
      // Column W: مرجع طلب المبيعات (Sales Order Reference)
      salesOrderRef: '',
      
      // Column X: التوقيع الإلكتروني (Electronic Signature)
      electronicSignature: '',
      
      // Column Y: دليل الغذاء والدواء ومستلزمات المطاعم (Food, Drug & Restaurant Supplies Guide)
      foodDrugGuide: '',
      
      // Column Z: الرابط الخارجي (External Link)
      externalLink: '',
      
      // Additional info
      pageNumber: this.currentPage
    };
    
    try {
      const cells = row.querySelectorAll('.ms-DetailsRow-cell');
      
      if (cells.length === 0) {
        console.warn(`No cells found in row ${index}`);
        return invoice;
      }
      
      // Extract data from each cell based on the actual structure
      // Cell 0: Document ID and Internal ID
      const idCell = cells[0];
      if (idCell) {
        const electronicIdLink = idCell.querySelector('.internalId-link a');
        if (electronicIdLink) {
          invoice.electronicNumber = electronicIdLink.textContent?.trim() || '';
        }
        
        const internalIdElement = idCell.querySelector('.griCellSubTitle');
        if (internalIdElement) {
          invoice.internalNumber = internalIdElement.textContent?.trim() || '';
        }
      }
      
      // Cell 1: Date Information
      const dateCell = cells[1];
      if (dateCell) {
        const issueDateMain = dateCell.querySelector('.griCellTitleGray');
        const submissionTime = dateCell.querySelector('.griCellSubTitle');
        
        if (issueDateMain) {
          invoice.issueDate = issueDateMain.textContent?.trim() || '';
          invoice.submissionDate = invoice.issueDate; // Often the same
        }
        
        if (submissionTime && submissionTime.textContent?.trim()) {
          invoice.issueDate += ` ${submissionTime.textContent.trim()}`;
        }
      }
      
      // Cell 2: Document Type and Version
      const typeCell = cells[2];
      if (typeCell) {
        const typeMain = typeCell.querySelector('.griCellTitleGray');
        const versionMain = typeCell.querySelector('.griCellSubTitle');
        
        if (typeMain) {
          invoice.documentType = typeMain.textContent?.trim() || '';
        }
        if (versionMain) {
          invoice.documentVersion = versionMain.textContent?.trim() || '';
        }
      }
      
      // Cell 3: Total Amount and Currency
      const totalCell = cells[3];
      if (totalCell) {
        const totalAmount = totalCell.querySelector('.griCellTitleGray');
        if (totalAmount) {
          const amountText = totalAmount.textContent?.trim() || '';
          // Extract currency and amount
          if (amountText.includes('EGP')) {
            invoice.invoiceCurrency = 'EGP';
            invoice.totalInvoice = amountText.replace('EGP', '').trim();
            invoice.invoiceValue = invoice.totalInvoice;
          } else {
            invoice.totalInvoice = amountText;
            invoice.invoiceValue = amountText;
            invoice.invoiceCurrency = 'EGP'; // Default
          }
        }
      }
      
      // Cell 4: Supplier/Seller Information
      const supplierCell = cells[4];
      if (supplierCell) {
        const supplierName = supplierCell.querySelector('.griCellTitleGray');
        const supplierTax = supplierCell.querySelector('.griCellSubTitle');
        
        if (supplierName) {
          invoice.sellerName = supplierName.textContent?.trim() || '';
        }
        if (supplierTax) {
          invoice.sellerTaxNumber = supplierTax.textContent?.trim() || '';
        }
      }
      
      // Cell 5: Receiver/Buyer Information
      const receiverCell = cells[5];
      if (receiverCell) {
        const receiverName = receiverCell.querySelector('.griCellTitleGray');
        const receiverTax = receiverCell.querySelector('.griCellSubTitle');
        
        if (receiverName) {
          invoice.buyerName = receiverName.textContent?.trim() || '';
        }
        if (receiverTax) {
          invoice.buyerTaxNumber = receiverTax.textContent?.trim() || '';
        }
      }
      
      // Cell 6: Submission ID (if exists)
      const submissionCell = cells[6];
      if (submissionCell) {
        const submissionLink = submissionCell.querySelector('.submissionId-link');
        if (submissionLink) {
          invoice.purchaseOrderRef = submissionLink.textContent?.trim() || '';
        }
      }
      
      // Cell 7: Status
      const statusCell = cells[7];
      if (statusCell) {
        const statusText = statusCell.querySelector('.textStatus');
        if (statusText) {
          invoice.status = statusText.textContent?.trim() || '';
        } else {
          // Check for complex status (Valid -> Cancelled)
          const validStatus = statusCell.querySelector('.status-Valid');
          const cancelledStatus = statusCell.querySelector('.status-Cancelled');
          
          if (validStatus && cancelledStatus) {
            invoice.status = 'Valid → Cancelled';
          } else if (validStatus) {
            invoice.status = 'Valid';
          } else {
            // Try to get any status text
            invoice.status = statusCell.textContent?.trim() || '';
          }
        }
      }
      
      // Try to extract VAT amount (usually calculated as percentage of total)
      if (invoice.totalInvoice) {
        const totalValue = parseFloat(invoice.totalInvoice.replace(/,/g, ''));
        if (!isNaN(totalValue)) {
          // Estimate VAT as 14% (common rate in Egypt)
          invoice.vatAmount = (totalValue * 0.14 / 1.14).toFixed(2);
          invoice.invoiceValue = (totalValue - parseFloat(invoice.vatAmount)).toFixed(2);
        }
      }
      
      // Set default values for missing fields
      invoice.taxDiscount = '0';
      invoice.sellerAddress = invoice.sellerName ? 'غير محدد' : '';
      invoice.buyerAddress = invoice.buyerName ? 'غير محدد' : '';
      invoice.purchaseOrderDesc = '';
      invoice.salesOrderRef = '';
      invoice.salesOrderDesc = '';
      invoice.electronicSignature = 'موقع إلكترونياً';
      
      // Extract shareId from submission link if available
      if (submissionCell && submissionCell.querySelector('.submissionId-link')) {
        const submissionLink = submissionCell.querySelector('.submissionId-link');
        if (submissionLink) {
          invoice.purchaseOrderRef = submissionLink.textContent?.trim() || '';
        }
      }
      
    } catch (error) {
      console.warn(`ETA Exporter: Error extracting data from row ${index}:`, error);
    }
    
    return invoice;
  }
  
  isValidInvoiceData(invoice) {
    return !!(invoice.electronicNumber || invoice.internalNumber || invoice.totalInvoice);
  }
  
  async getAllPagesData(options = {}) {
    try {
      this.isProcessingAllPages = true;
      this.allPagesData = [];
      
      // First, scan current page to get pagination info
      this.scanForInvoices();
      
      if (this.totalPages <= 1) {
        // Only one page, return current data
        return {
          success: true,
          data: this.invoiceData,
          totalProcessed: this.invoiceData.length
        };
      }
      
      // Start from page 1
      await this.navigateToPage(1);
      
      // Process all pages
      for (let page = 1; page <= this.totalPages; page++) {
        try {
          // Update progress
          if (this.progressCallback) {
            this.progressCallback({
              currentPage: page,
              totalPages: this.totalPages,
              message: `جاري معالجة الصفحة ${page} من ${this.totalPages}...`
            });
          }
          
          // Wait for page to load and scan
          await this.waitForPageLoad();
          this.scanForInvoices();
          
          // Add current page data to all pages data
          this.allPagesData.push(...this.invoiceData);
          
          console.log(`ETA Exporter: Processed page ${page}, collected ${this.invoiceData.length} invoices`);
          
          // Navigate to next page if not the last page
          if (page < this.totalPages) {
            await this.navigateToNextPage();
            await this.delay(1500); // Wait between page transitions
          }
          
        } catch (error) {
          console.error(`Error processing page ${page}:`, error);
          // Continue with next page even if current page fails
        }
      }
      
      return {
        success: true,
        data: this.allPagesData,
        totalProcessed: this.allPagesData.length
      };
      
    } catch (error) {
      console.error('Error getting all pages data:', error);
      return { 
        success: false, 
        data: this.allPagesData,
        error: error.message 
      };
    } finally {
      this.isProcessingAllPages = false;
    }
  }
  
  async navigateToPage(pageNumber) {
    try {
      // Look for page number button
      const pageButton = document.querySelector(`[aria-label="Page ${pageNumber}"], .eta-pageNumber[data-page="${pageNumber}"]`);
      
      if (pageButton) {
        pageButton.click();
        await this.waitForPageLoad();
        return true;
      }
      
      // Alternative: look for page input field
      const pageInput = document.querySelector('input[type="number"][aria-label*="page"], .ms-TextField-field[type="number"]');
      if (pageInput) {
        pageInput.value = pageNumber.toString();
        pageInput.dispatchEvent(new Event('change', { bubbles: true }));
        pageInput.dispatchEvent(new Event('blur', { bubbles: true }));
        
        // Look for go/submit button
        const goButton = document.querySelector('[aria-label*="Go"], .ms-Button[type="submit"]');
        if (goButton) {
          goButton.click();
        }
        
        await this.waitForPageLoad();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error navigating to page ${pageNumber}:`, error);
      return false;
    }
  }
  
  async navigateToNextPage() {
    try {
      // Look for next page button
      const nextButton = document.querySelector(
        '[aria-label="Next page"], [aria-label="التالي"], .ms-Button[data-automation-id="nextPageButton"], .eta-pageNumber.is-next'
      );
      
      if (nextButton && !nextButton.disabled) {
        nextButton.click();
        return true;
      }
      
      // Alternative: look for current page + 1
      const currentPageNum = this.currentPage;
      const nextPageButton = document.querySelector(`[aria-label="Page ${currentPageNum + 1}"]`);
      
      if (nextPageButton) {
        nextPageButton.click();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error navigating to next page:', error);
      return false;
    }
  }
  
  async waitForPageLoad() {
    // Wait for loading indicators to disappear
    await this.waitForCondition(() => {
      const loadingIndicators = document.querySelectorAll(
        '.ms-Spinner, .loading, [aria-label*="Loading"], [aria-label*="جاري التحميل"]'
      );
      return loadingIndicators.length === 0;
    }, 10000);
    
    // Wait for invoice rows to appear
    await this.waitForCondition(() => {
      const rows = document.querySelectorAll('.ms-DetailsRow[role="row"]');
      return rows.length > 0;
    }, 10000);
    
    // Additional wait to ensure data is fully loaded
    await this.delay(1000);
  }
  
  async waitForCondition(condition, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (condition()) {
        return true;
      }
      await this.delay(100);
    }
    
    return false;
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }
  
  async getInvoiceDetails(invoiceId) {
    try {
      // Use API call instead of page navigation
      const details = await this.fetchInvoiceDetailsViaAPI(invoiceId);
      
      return {
        success: true,
        data: details
      };
    } catch (error) {
      console.error('Error getting invoice details:', error);
      return { success: false, data: [] };
    }
  }
  
  async fetchInvoiceDetailsViaAPI(invoiceId) {
    try {
      // Method 1: Try to fetch from the API endpoint
      const apiUrl = `https://invoicing.eta.gov.eg/api/v1/documents/${invoiceId}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          // Copy existing session cookies
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        return this.parseAPIInvoiceDetails(data);
      }
      
      // Method 2: Try alternative endpoint
      return await this.fetchInvoiceDetailsAlternative(invoiceId);
      
    } catch (error) {
      console.warn('API fetch failed, trying alternative method:', error);
      return await this.fetchInvoiceDetailsAlternative(invoiceId);
    }
  }
  
  async fetchInvoiceDetailsAlternative(invoiceId) {
    try {
      // Method 3: Use iframe to load details without affecting main page
      return await this.fetchInvoiceDetailsViaIframe(invoiceId);
    } catch (error) {
      console.warn('Iframe method failed, extracting from current page data:', error);
      return this.extractDetailsFromCurrentPageData(invoiceId);
    }
  }
  
  async fetchInvoiceDetailsViaIframe(invoiceId) {
    return new Promise((resolve, reject) => {
      // Create hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      
      const detailsUrl = `https://invoicing.eta.gov.eg/documents/${invoiceId}`;
      
      iframe.onload = () => {
        try {
          // Wait a bit for content to load
          setTimeout(() => {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
              const details = this.extractInvoiceDetailsFromDocument(iframeDoc);
              
              // Clean up
              document.body.removeChild(iframe);
              resolve(details);
            } catch (error) {
              document.body.removeChild(iframe);
              reject(error);
            }
          }, 2000);
        } catch (error) {
          document.body.removeChild(iframe);
          reject(error);
        }
      };
      
      iframe.onerror = () => {
        document.body.removeChild(iframe);
        reject(new Error('Failed to load iframe'));
      };
      
      // Add to page and load
      document.body.appendChild(iframe);
      iframe.src = detailsUrl;
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          reject(new Error('Iframe timeout'));
        }
      }, 10000);
    });
  }
  
  parseAPIInvoiceDetails(apiData) {
    const details = [];
    
    try {
      // Parse API response structure
      if (apiData.invoiceLines && Array.isArray(apiData.invoiceLines)) {
        apiData.invoiceLines.forEach(line => {
          details.push({
            itemName: line.description || line.itemName || '',
            unitCode: line.unitType?.code || 'EA',
            unitName: line.unitType?.name || 'قطعة',
            quantity: line.quantity || '1',
            unitPrice: line.unitValue?.amount || '0',
            totalValue: line.salesTotal || '0',
            vatAmount: line.taxTotals?.find(tax => tax.taxType === 'T1')?.amount || '0',
            totalWithVat: line.netTotal || '0'
          });
        });
      }
      
      // If no line items, create summary item
      if (details.length === 0 && apiData.totalAmount) {
        details.push({
          itemName: 'إجمالي الفاتورة',
          unitCode: 'EA',
          unitName: 'قطعة',
          quantity: '1',
          unitPrice: apiData.totalAmount,
          totalValue: apiData.totalAmount,
          vatAmount: this.calculateVAT(apiData.totalAmount),
          totalWithVat: apiData.totalAmount
        });
      }
      
    } catch (error) {
      console.error('Error parsing API data:', error);
    }
    
    return details;
  }
  
  extractInvoiceDetailsFromDocument(doc) {
    const details = [];
    
    try {
      // Look for invoice line items table in the document
      const itemsTable = doc.querySelector('.invoice-items-table, .ms-DetailsList, [data-automation-id="DetailsList"]');
      
      if (itemsTable) {
        const rows = itemsTable.querySelectorAll('.ms-DetailsRow[role="row"], tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('.ms-DetailsRow-cell, td');
          
          if (cells.length >= 6) {
            const item = {
              itemName: this.extractCellText(cells[0]) || '',
              unitCode: this.extractCellText(cells[1]) || 'EA',
              unitName: this.extractCellText(cells[2]) || 'قطعة',
              quantity: this.extractCellText(cells[3]) || '1',
              unitPrice: this.extractCellText(cells[4]) || '0',
              totalValue: this.extractCellText(cells[5]) || '0',
              vatAmount: this.calculateVAT(this.extractCellText(cells[5])),
              totalWithVat: this.calculateTotalWithVAT(this.extractCellText(cells[5]))
            };
            
            if (item.itemName && item.itemName !== 'اسم الصنف') {
              details.push(item);
            }
          }
        });
      }
      
      // If no items found, try to extract from summary
      if (details.length === 0) {
        const summaryData = this.extractSummaryFromDocument(doc);
        details.push(...summaryData);
      }
      
    } catch (error) {
      console.error('Error extracting from document:', error);
    }
    
    return details;
  }
  
  extractDetailsFromCurrentPageData(invoiceId) {
    // Extract what we can from the current page data
    const invoice = this.invoiceData.find(inv => inv.electronicNumber === invoiceId);
    
    if (!invoice) {
      return [];
    }
    
    // Create a summary item based on available data
    return [{
      itemName: 'إجمالي الفاتورة',
      unitCode: 'EA',
      unitName: 'قطعة',
      quantity: '1',
      unitPrice: invoice.totalInvoice || '0',
      totalValue: invoice.invoiceValue || invoice.totalInvoice || '0',
      vatAmount: invoice.vatAmount || this.calculateVAT(invoice.totalInvoice),
      totalWithVat: invoice.totalInvoice || '0'
    }];
  }
  
  extractSummaryFromDocument(doc) {
    const summaryItems = [];
    
    try {
      // Extract basic invoice info as a single line item
      const totalElement = doc.querySelector('[data-automation-key="total"] .griCellTitleGray, .total-amount');
      const total = totalElement?.textContent?.trim() || '0';
      
      if (parseFloat(total.replace(/,/g, '')) > 0) {
        summaryItems.push({
          itemName: 'إجمالي الفاتورة',
          unitCode: 'EA',
          unitName: 'قطعة',
          quantity: '1',
          unitPrice: total,
          totalValue: total,
          vatAmount: this.calculateVAT(total),
          totalWithVat: total
        });
      }
    } catch (error) {
      console.error('Error extracting summary from document:', error);
    }
    
    return summaryItems;
  }
  
  extractInvoiceDetailsFromPage() {
    const details = [];
    
    try {
      // Look for invoice line items table
      const itemsTable = document.querySelector('.invoice-items-table, .ms-DetailsList, [data-automation-id="DetailsList"]');
      
      if (itemsTable) {
        const rows = itemsTable.querySelectorAll('.ms-DetailsRow[role="row"], tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('.ms-DetailsRow-cell, td');
          
          if (cells.length >= 6) {
            const item = {
              itemName: this.extractCellText(cells[0]) || '',
              unitCode: this.extractCellText(cells[1]) || 'EA',
              unitName: this.extractCellText(cells[2]) || 'قطعة',
              quantity: this.extractCellText(cells[3]) || '1',
              unitPrice: this.extractCellText(cells[4]) || '0',
              totalValue: this.extractCellText(cells[5]) || '0',
              vatAmount: this.calculateVAT(this.extractCellText(cells[5])),
              totalWithVat: this.calculateTotalWithVAT(this.extractCellText(cells[5]))
            };
            
            if (item.itemName && item.itemName !== 'اسم الصنف') {
              details.push(item);
            }
          }
        });
      }
      
      // If no items found in table, try to extract from summary
      if (details.length === 0) {
        const summaryData = this.extractSummaryAsItems();
        details.push(...summaryData);
      }
      
    } catch (error) {
      console.error('Error extracting invoice details:', error);
    }
    
    return details;
  }
  
  extractCellText(cell) {
    if (!cell) return '';
    
    // Try different selectors for cell content
    const textElement = cell.querySelector('.griCellTitle, .griCellTitleGray, .ms-DetailsRow-cellContent') || cell;
    return textElement.textContent?.trim() || '';
  }
  
  calculateVAT(totalValue) {
    const value = parseFloat(totalValue?.replace(/,/g, '') || 0);
    // Assuming 14% VAT rate (common in Egypt)
    return (value * 0.14 / 1.14).toFixed(2);
  }
  
  calculateTotalWithVAT(baseValue) {
    const value = parseFloat(baseValue?.replace(/,/g, '') || 0);
    const vat = parseFloat(this.calculateVAT(baseValue));
    return (value + vat).toFixed(2);
  }
  
  extractSummaryAsItems() {
    // If detailed items are not available, create a summary item
    const summaryItems = [];
    
    try {
      // Extract basic invoice info as a single line item
      const totalElement = document.querySelector('[data-automation-key="total"] .griCellTitleGray');
      const total = totalElement?.textContent?.trim() || '0';
      
      if (parseFloat(total.replace(/,/g, '')) > 0) {
        summaryItems.push({
          itemName: 'إجمالي الفاتورة',
          unitCode: 'EA',
          unitName: 'قطعة',
          quantity: '1',
          unitPrice: total,
          totalValue: total,
          vatAmount: this.calculateVAT(total),
          totalWithVat: total
        });
      }
    } catch (error) {
      console.error('Error extracting summary items:', error);
    }
    
    return summaryItems;
  }
  
  getInvoiceData() {
    return {
      invoices: this.invoiceData,
      totalCount: this.totalCount,
      currentPage: this.currentPage,
      totalPages: this.totalPages
    };
  }
  
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.rescanTimeout) {
      clearTimeout(this.rescanTimeout);
    }
  }
}

// Initialize content script
const etaContentScript = new ETAContentScript();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getInvoiceData':
      sendResponse({
        success: true,
        data: etaContentScript.getInvoiceData()
      });
      break;
      
    case 'getInvoiceDetails':
      etaContentScript.getInvoiceDetails(request.invoiceId)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Indicates async response
      
    case 'getAllPagesData':
      // Set up progress callback
      if (request.options && request.options.progressCallback) {
        etaContentScript.setProgressCallback((progress) => {
          chrome.runtime.sendMessage({
            action: 'progressUpdate',
            progress: progress
          });
        });
      }
      
      etaContentScript.getAllPagesData(request.options)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Indicates async response
      
    case 'rescanPage':
      etaContentScript.scanForInvoices();
      sendResponse({
        success: true,
        data: etaContentScript.getInvoiceData()
      });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true;
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  etaContentScript.cleanup();
});