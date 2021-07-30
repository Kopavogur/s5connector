using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using S5;
using S5Connector.Models;
using S5Connector.Utils;
using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

namespace S5Connector.Controllers
{
    public class HomeController : Controller
    {
        private ILogger<HomeController> Logger { get; }
        private S5Client S5Client { get; }

        public HomeController(ILogger<HomeController> logger, S5Client s5Client)
        {
            Logger = logger;
            S5Client = s5Client;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult ListTickets()
        {
            ServiceSoap client = S5Client.Get;

            GetViewAbendingarRequest request = new GetViewAbendingarRequest
            {
                S5Username = S5Client.User,
                S5Password = S5Client.Password
            };
            Task<GetViewAbendingarResponse> task = client.GetViewAbendingarAsync(request);
            GetViewAbendingarResponse response = task.Result;

            DataSet dataSet = new DataSet();
            StringReader resultStringReader = new StringReader(response.GetViewAbendingarResult.table.Any1.InnerXml);
            dataSet.ReadXml(resultStringReader);

            DataTable table = dataSet.Tables["Abendingar"];
            DataView dv = table.DefaultView;

            DataRow[] rows = table.Select();
            Array.Sort<DataRow>(
                rows,
                new Comparison<DataRow>(
                    (r1, r2) => Convert.ToDateTime(r2[2].ToString()).CompareTo(Convert.ToDateTime(r1[2].ToString()))
                )
            );
            ListTicketsViewModel model = new ListTicketsViewModel
            {
                Table = table,
                Rows = rows
            };

            return View(model);
        }

        public class ListTicketsViewModel
        {
            public DataTable Table { get; set; }
            public DataRow[] Rows { get; set; }
        }

        [HttpGet]
        public IActionResult NewTicket()
        {
            return View();
        }

        [HttpPost]
        public IActionResult NewTicket(
            string abending, string kennitala, string abendingaradili, string netfang, string simi, string heimilisfang, string lysing, string hnit_A, string hnit_N,
            List<IFormFile> files
        )
        {
            ValuesABE values = DoNewTicket(abending, kennitala, abendingaradili, netfang, simi, heimilisfang, lysing, hnit_A, hnit_N, files);
            return View();
        }

        public IActionResult AddFiles(string s5EequestID, List<IFormFile> files)
        {
            if (files != null) DoAddFiles(s5EequestID, files);
            return View();
        }

        public ValuesABE NewTicketREST(
            string abending, string kennitala, string abendingaradili, string netfang, string simi, string heimilisfang, string lysing, string hnit_A, string hnit_N,
            List<IFormFile> files
        )
        {
            return DoNewTicket(
                abending, kennitala, abendingaradili, netfang, simi, heimilisfang, lysing, hnit_A, hnit_N, files);
        }

        public IActionResult MapArc()
        {
            return View();
        }

        public IActionResult MapLm()
        {
            return View();
        }

        public IActionResult MapGoo()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        private ValuesABE DoNewTicket(
            string abending, string kennitala, string abendingaradili, string netfang, string simi, string heimilisfang, string lysing, string hnit_A, string hnit_N,
            List<IFormFile> files,
            ServiceSoap client = null
        )
        {
            client ??= S5Client.Get;

            CreateAndUpdateAbending_PRequest request = new CreateAndUpdateAbending_PRequest
            {
                S5Username = S5Client.User,
                S5Password = S5Client.Password,
                Abending = abending,
                Kennitala = kennitala,
                Abendingaradili = abendingaradili,
                Netfang = netfang,
                Simi = simi,
                Heimilisfang = heimilisfang,
                Lysing = lysing,
                Hnit_A = hnit_A,
                Hnit_N = hnit_N
            };

            Task<CreateAndUpdateAbending_PResponse> task = client.CreateAndUpdateAbending_PAsync(request);
            ReturnValueABE result = task.Result.CreateAndUpdateAbending_PResult;
            if (result != null && !result.success)
            {
                throw new Exception($"CreateAndUpdateAbending failes with {result.message}");
            }
            ValuesABE values = result.values;

            if (files != null) DoAddFiles(values.S5RequestID, files, client);

            return values;
        }

        private void DoAddFiles(string s5EequestID, List<IFormFile> files, ServiceSoap client = null)
        {
            client ??= S5Client.Get;

            foreach (IFormFile file in files)
            {
                MemoryStream memoryStream = new MemoryStream();
                using (Stream fileStream = file.OpenReadStream())
                {
                    fileStream.CopyTo(memoryStream);
                }
                byte[] bytes = memoryStream.ToArray();

                AddFileRequest request = new AddFileRequest
                {
                    S5Username = S5Client.User,
                    S5Password = S5Client.Password,
                    S5RequestID = s5EequestID,
                    File = bytes,
                    Filename = file.FileName
                };

                Task<AddFileResponse> task = client.AddFileAsync(request);
                AddFileResponse response = task.Result;
                if (!response.AddFileResult.success)
                {
                    throw new Exception($"Add file {file.FileName} failes with {response.AddFileResult.message}");
                }
            }
        }
    }
}
